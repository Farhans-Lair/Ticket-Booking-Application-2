const authService = require('../services/auth.services');
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const logger      = require('../config/logger');

// ── Token config ──────────────────────────────────────────────────────────────
//
// Three separate secrets — each token type is cryptographically independent:
//
//  JWT_ACCESS_SECRET  — signs short-lived access tokens (8h)
//                       verified on every protected API call in auth.middleware.js
//
//  JWT_REFRESH_SECRET — signs the refresh token JWT wrapper that travels in
//                       the httpOnly cookie. The inner opaque token (random hex)
//                       is what gets stored/rotated in the DB. The JWT wrapper
//                       adds an extra signature check before we even hit the DB.
//
//  JWT_SESSION_SECRET — signs a lightweight session token returned to the
//                       frontend on login-verify. The frontend stores this in
//                       sessionStorage (per-tab) and sends it as a secondary
//                       header (X-Session-Token). Used to bind the session to
//                       a specific browser tab and detect cross-tab token reuse.
//
const ACCESS_EXPIRY   = '8h';
const ACCESS_MAX_MS   = 8  * 60 * 60 * 1000;
const REFRESH_EXPIRY  = '7d';
const REFRESH_MAX_MS  = 7  * 24 * 60 * 60 * 1000;
const SESSION_EXPIRY  = '8h';   // matches access token lifetime

// ── Token issuers ─────────────────────────────────────────────────────────────

/**
 * Access token — verifiable by auth.middleware on every API call.
 * Secret: JWT_ACCESS_SECRET
 */
const _issueAccessToken = (userId, role) =>
  jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );

/**
 * Refresh token — opaque random hex wrapped in a signed JWT.
 * The JWT wrapper is verified before the DB lookup, adding an extra layer.
 * Secret: JWT_REFRESH_SECRET
 */
const _issueRefreshToken = () => {
  const opaqueToken = crypto.randomBytes(64).toString('hex');
  const signedWrapper = jwt.sign(
    { token: opaqueToken },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { opaqueToken, signedWrapper };
};

/**
 * Session token — lightweight per-tab identifier stored in sessionStorage.
 * Binds the session to a browser tab. Not used for API auth directly.
 * Secret: JWT_SESSION_SECRET
 */
const _issueSessionToken = (userId, role) =>
  jwt.sign(
    { id: userId, role, sessionId: crypto.randomBytes(16).toString('hex') },
    process.env.JWT_SESSION_SECRET,
    { expiresIn: SESSION_EXPIRY }
  );

/**
 * Extract and verify the opaque token from the signed refresh JWT wrapper.
 * Returns the raw opaque token string.
 * Throws if the wrapper signature is invalid or expired.
 */
const _unwrapRefreshToken = (signedWrapper) => {
  try {
    const payload = jwt.verify(signedWrapper, process.env.JWT_REFRESH_SECRET);
    return payload.token;
  } catch (err) {
    throw new Error('Invalid refresh token. Please log in again.');
  }
};

/**
 * Set access token cookie and refresh token cookie on the response.
 */
const _setAuthCookies = (res, accessToken, signedRefreshWrapper) => {
  const secure = process.env.COOKIE_SECURE === 'true';

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path:     '/',
    maxAge:   ACCESS_MAX_MS,
  });

  res.cookie('refreshToken', signedRefreshWrapper, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path:     '/auth/refresh',   // only sent to the refresh endpoint
    maxAge:   REFRESH_MAX_MS,
  });
};

// ── User signup ───────────────────────────────────────────────────────────────

const signupRequest = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    await authService.initiateSignup(name, email, password);
    logger.info('Signup OTP sent', { email });
    res.status(200).json({
      message: 'Verification code sent to your email. Please enter it to complete registration.',
    });
  } catch (err) {
    logger.error('Signup OTP request failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

const signupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    await authService.completeSignup(email, otp);
    logger.info('User registered', { email });
    res.status(201).json({ message: 'Registration successful. You can now log in.' });
  } catch (err) {
    logger.error('Signup verify failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

const loginRequest = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    await authService.initiateLogin(email, password);
    logger.info('Login OTP sent', { email });
    res.status(200).json({
      message: 'Verification code sent to your email. Please enter it to complete login.',
    });
  } catch (err) {
    logger.error('Login OTP request failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

const loginVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { userId, role } = await authService.completeLogin(email, otp);

    // Issue all three tokens using their respective secrets
    const accessToken            = _issueAccessToken(userId, role);
    const { opaqueToken,
            signedWrapper }      = _issueRefreshToken();
    const sessionToken           = _issueSessionToken(userId, role);

    // Store hashed opaque token in DB (not the JWT wrapper)
    await authService.saveRefreshToken(userId, opaqueToken);

    // Access + refresh go into httpOnly cookies
    _setAuthCookies(res, accessToken, signedWrapper);

    logger.info('User logged in', { userId, role, email });

    // Session token returned in body — frontend stores in sessionStorage (per-tab)
    res.json({ userId, role, token: accessToken, sessionToken });
  } catch (err) {
    logger.error('Login verify failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

// ── Token refresh ─────────────────────────────────────────────────────────────

const refresh = async (req, res, next) => {
  try {
    const signedWrapper = req.cookies?.refreshToken;
    if (!signedWrapper) {
      return res.status(401).json({ error: 'No refresh token. Please log in again.' });
    }

    // Step 1 — verify JWT_REFRESH_SECRET signature before hitting DB
    const opaqueToken = _unwrapRefreshToken(signedWrapper);

    // Step 2 — validate opaque token in DB and rotate (consume old, issue new)
    const { userId, role } = await authService.rotateRefreshToken(opaqueToken);

    // Step 3 — issue fresh set of all three tokens
    const newAccessToken              = _issueAccessToken(userId, role);
    const { opaqueToken: newOpaque,
            signedWrapper: newWrapper } = _issueRefreshToken();
    const newSessionToken             = _issueSessionToken(userId, role);

    // Persist new opaque token hash
    await authService.saveRefreshToken(userId, newOpaque);

    _setAuthCookies(res, newAccessToken, newWrapper);

    logger.info('Token refreshed', { userId });
    res.json({ token: newAccessToken, sessionToken: newSessionToken });
  } catch (err) {
    logger.error('Token refresh failed', { error: err.message });
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  const secure = process.env.COOKIE_SECURE === 'true';

  try {
    const signedWrapper = req.cookies?.refreshToken;
    if (signedWrapper) {
      // Unwrap to get opaque token, then revoke from DB
      const opaqueToken = _unwrapRefreshToken(signedWrapper);
      await authService.revokeRefreshToken(opaqueToken);
    }
  } catch (_) { /* non-fatal */ }

  res.clearCookie('token',        { httpOnly: true, secure, sameSite: 'lax', path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, secure, sameSite: 'lax', path: '/auth/refresh' });

  logger.info('User logged out', { userId: req.user?.id });
  res.json({ message: 'Logged out successfully' });
};

// ── Current user ──────────────────────────────────────────────────────────────

const me = (req, res) => res.json({ userId: req.user.id, role: req.user.role });

// ── Organizer signup ──────────────────────────────────────────────────────────

const organizerSignupRequest = async (req, res, next) => {
  try {
    const { name, email, password, business_name, contact_phone, gst_number, address } = req.body;
    await authService.initiateOrganizerSignup(name, email, password,
      { business_name, contact_phone, gst_number, address });
    logger.info('Organizer signup OTP sent', { email });
    res.status(200).json({
      message: 'Verification code sent to your email. Please enter it to complete organizer registration.',
    });
  } catch (err) {
    logger.error('Organizer signup OTP failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

const organizerSignupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { user } = await authService.completeOrganizerSignup(email, otp);
    logger.info('Organizer registered — pending approval', { userId: user.id, email });
    res.status(201).json({
      message: 'Registration successful. Your organizer account is pending admin approval.',
      status: 'pending',
    });
  } catch (err) {
    logger.error('Organizer signup verify failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

module.exports = {
  signupRequest, signupVerify,
  loginRequest, loginVerify,
  refresh, logout, me,
  organizerSignupRequest, organizerSignupVerify,
};

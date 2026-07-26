const authService = require('../services/auth.services');
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const logger      = require('../config/logger');

const ACCESS_EXPIRY   = '8h';
const ACCESS_MAX_MS   = 8  * 60 * 60 * 1000;
const REFRESH_EXPIRY  = '7d';
const REFRESH_MAX_MS  = 7  * 24 * 60 * 60 * 1000;
const SESSION_EXPIRY  = '8h';

const _issueAccessToken = (userId, role) =>
  jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );

const _issueRefreshToken = () => {
  const opaqueToken = crypto.randomBytes(64).toString('hex');
  const signedWrapper = jwt.sign(
    { token: opaqueToken },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { opaqueToken, signedWrapper };
};

const _issueSessionToken = (userId, role) =>
  jwt.sign(
    { id: userId, role, sessionId: crypto.randomBytes(16).toString('hex') },
    process.env.JWT_SESSION_SECRET,
    { expiresIn: SESSION_EXPIRY }
  );

const _unwrapRefreshToken = (signedWrapper) => {
  try {
    const payload = jwt.verify(signedWrapper, process.env.JWT_REFRESH_SECRET);
    return payload.token;
  } catch (err) {
    throw new Error('Invalid refresh token. Please log in again.');
  }
};

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
    path:     '/auth/refresh',
    maxAge:   REFRESH_MAX_MS,
  });
};

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

    const accessToken            = _issueAccessToken(userId, role);
    const { opaqueToken,
            signedWrapper }      = _issueRefreshToken();
    const sessionToken           = _issueSessionToken(userId, role);

    await authService.saveRefreshToken(userId, opaqueToken);

    _setAuthCookies(res, accessToken, signedWrapper);

    logger.info('User logged in', { userId, role, email });

    res.json({ userId, role, token: accessToken, sessionToken });
  } catch (err) {
    logger.error('Login verify failed', { email: req.body?.email, error: err.message });
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const signedWrapper = req.cookies?.refreshToken;
    if (!signedWrapper) {
      return res.status(401).json({ error: 'No refresh token. Please log in again.' });
    }

    const opaqueToken = _unwrapRefreshToken(signedWrapper);

    const { userId, role } = await authService.rotateRefreshToken(opaqueToken);

    const newAccessToken              = _issueAccessToken(userId, role);
    const { opaqueToken: newOpaque,
            signedWrapper: newWrapper } = _issueRefreshToken();
    const newSessionToken             = _issueSessionToken(userId, role);

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

const logout = async (req, res) => {
  const secure = process.env.COOKIE_SECURE === 'true';

  try {
    const signedWrapper = req.cookies?.refreshToken;
    if (signedWrapper) {

      const opaqueToken = _unwrapRefreshToken(signedWrapper);
      await authService.revokeRefreshToken(opaqueToken);
    }
  } catch (_) {  }

  res.clearCookie('token',        { httpOnly: true, secure, sameSite: 'lax', path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, secure, sameSite: 'lax', path: '/auth/refresh' });

  logger.info('User logged out', { userId: req.user?.id });
  res.json({ message: 'Logged out successfully' });
};

const me = (req, res) => res.json({ userId: req.user.id, role: req.user.role });

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

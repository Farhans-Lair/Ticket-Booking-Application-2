

process.env.DB_HOST     = process.env.DB_HOST     || "127.0.0.1";
process.env.DB_PORT     = process.env.DB_PORT     || "3306";
process.env.DB_NAME     = process.env.DB_NAME     || "ticket_booking_db";
process.env.DB_USER     = process.env.DB_USER     || "ticket_user_1";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "ticket_password";

process.env.NODE_ENV    = "test";

process.env.JWT_SECRET          = process.env.JWT_SECRET          || "test_jwt_secret_for_ci";
process.env.RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || "rzp_test_placeholder";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
process.env.EMAIL_USER          = process.env.EMAIL_USER          || "test@example.com";
process.env.EMAIL_PASS          = process.env.EMAIL_PASS          || "test_pass";

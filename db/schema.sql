CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(150),
  event_date DATETIME NOT NULL,
  price FLOAT NOT NULL,
  total_tickets INT NOT NULL,
  available_tickets INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  tickets_booked INT NOT NULL,
  ticket_amount FLOAT NOT NULL,
  convenience_fee FLOAT NOT NULL,
  gst_amount FLOAT NOT NULL,
  total_paid FLOAT NOT NULL,
  razorpay_order_id VARCHAR(255) DEFAULT NULL,
  razorpay_payment_id VARCHAR(255) DEFAULT NULL,
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE
);

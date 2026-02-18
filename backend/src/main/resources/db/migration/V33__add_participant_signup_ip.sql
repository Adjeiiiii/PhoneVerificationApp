-- Store client IP when participant signs up (OTP verification)
ALTER TABLE participant ADD COLUMN IF NOT EXISTS signup_ip VARCHAR(45);

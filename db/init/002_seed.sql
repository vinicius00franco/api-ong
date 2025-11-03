-- 002_seed.sql: Seed data for ONG API

-- Insert organizations (password = 'password' hashed with bcrypt)
INSERT INTO organizations (name, email, password_hash) VALUES
('ONG A', 'onga@example.com', '$2b$10$S0BAdjm.thNhR8Zl.01bAegxO7dbFTTmqlCKTRPSN.CvnCQmTChtS'),
('ONG B', 'ongb@example.com', '$2b$10$S0BAdjm.thNhR8Zl.01bAegxO7dbFTTmqlCKTRPSN.CvnCQmTChtS');

-- Insert categories
INSERT INTO categories (name) VALUES
('Categoria1'),
('Categoria2'),
('Categoria3');

-- Insert products for ONG A (id=1)
INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES
('Produto A1', 'Descrição do produto A1', 10.50, 1, 'http://example.com/image1.jpg', 100, 500, 1),
('Produto A2', 'Descrição do produto A2', 20.00, 2, 'http://example.com/image2.jpg', 50, 300, 1),
('Produto A3', 'Descrição do produto A3', 15.75, 1, 'http://example.com/image3.jpg', 75, 400, 1),
('Produto A4', 'Descrição do produto A4', 30.00, 3, 'http://example.com/image4.jpg', 25, 600, 1),
('Produto A5', 'Descrição do produto A5', 5.99, 2, 'http://example.com/image5.jpg', 200, 200, 1);

-- Insert products for ONG B (id=2)
INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id) VALUES
('Produto B1', 'Descrição do produto B1', 12.00, 1, 'http://example.com/image6.jpg', 80, 450, 2),
('Produto B2', 'Descrição do produto B2', 25.50, 2, 'http://example.com/image7.jpg', 60, 350, 2),
('Produto B3', 'Descrição do produto B3', 18.90, 3, 'http://example.com/image8.jpg', 90, 550, 2),
('Produto B4', 'Descrição do produto B4', 40.00, 1, 'http://example.com/image9.jpg', 30, 700, 2),
('Produto B5', 'Descrição do produto B5', 8.75, 2, 'http://example.com/image10.jpg', 150, 250, 2);
import random
import uuid
from datetime import datetime, timedelta
import unicodedata

# Função para gerar data aleatória nos últimos 365 dias
def random_date():
    start = datetime.now() - timedelta(days=365)
    end = datetime.now()
    return start + (end - start) * random.random()

# Hash bcrypt para 'password'
password_hash = '$2b$10$S0BAdjm.thNhR8Zl.01bAegxO7dbFTTmqlCKTRPSN.CvnCQmTChtS'

# Nomes de ONGs realistas
ong_names = [
    "Amigos dos Animais", "Instituto Verde", "Ajuda Humanitária", "Proteção Infantil", "Refúgio Animal",
    "Educação para Todos", "Saúde Comunitária", "Meio Ambiente Sustentável", "Combate à Fome", "Direitos Humanos",
    "ONG Esperança", "Instituto do Bem", "Solidariedade Global", "Coração Solidário", "Futuro Melhor",
    "ONG Vida Nova", "Instituto Paz", "Ajuda Mútua", "Proteção Ambiental", "Crianças Felizes",
    "ONG União", "Instituto Justiça", "Solidariedade Local", "Amor ao Próximo", "ONG Renovação",
    "Instituto Liberdade", "Ajuda Social", "Proteção da Natureza", "Cuidado com Idosos", "ONG Harmonia",
    "Instituto Igualdade", "Solidariedade Juvenil", "Amigos da Terra", "ONG Progresso", "Instituto União",
    "Ajuda Comunitária", "Proteção Animal", "Crianças do Futuro", "ONG Paz Mundial", "Instituto Esperança"
]

# Categorias realistas
categories = [
    "Alimentos", "Roupas", "Brinquedos", "Livros", "Medicamentos",
    "Materiais de Construção", "Produtos de Higiene", "Equipamentos Esportivos", "Materiais Escolares", "Produtos para Animais",
    "Móveis", "Eletrodomésticos", "Produtos de Limpeza", "Ferramentas", "Produtos para Bebês",
    "Roupas de Cama", "Utensílios de Cozinha", "Produtos de Jardinagem", "Materiais Artísticos", "Produtos Eletrônicos"
]

# Produtos por categoria
products_by_category = {
    "Alimentos": ["Arroz 5kg", "Feijão 2kg", "Óleo de Soja", "Leite em Pó", "Macarrão", "Açúcar 2kg", "Café 500g", "Farinha de Trigo", "Milho em Lata", "Sardinha em Lata"],
    "Roupas": ["Camiseta Masculina", "Calça Jeans", "Vestido Feminino", "Jaqueta", "Meias", "Cueca", "Sutiã", "Blusa", "Shorts", "Sapatos"],
    "Brinquedos": ["Boneca", "Carrinho", "Quebra-Cabeça", "Bola", "Lego", "Bicicleta Infantil", "Patins", "Jogo de Tabuleiro", "Pelúcia", "Instrumento Musical"],
    "Livros": ["Livro de Matemática", "História Infantil", "Romance", "Enciclopédia", "Livro de Receitas", "Poesia", "Biografia", "Livro Didático", "Quadrinhos", "Dicionário"],
    "Medicamentos": ["Paracetamol", "Ibuprofeno", "Vitamina C", "Antibiótico", "Xarope para Tosse", "Creme Dental", "Shampoo Medicinal", "Pomada", "Gaze", "Termômetro"],
    "Materiais de Construção": ["Cimento", "Tijolo", "Tinta", "Prego", "Martelo", "Serra", "Furadeira", "Tubo PVC", "Concreto", "Telha"],
    "Produtos de Higiene": ["Sabonete", "Shampoo", "Condicionador", "Pasta de Dente", "Escova de Dente", "Papel Higiênico", "Absorvente", "Desodorante", "Creme Hidratante", "Lenços Umedecidos"],
    "Equipamentos Esportivos": ["Bola de Futebol", "Raquete de Tênis", "Bicicleta", "Patins", "Haltere", "Esteira", "Bola de Basquete", "Rede de Vôlei", "Luvas de Boxe", "Skate"],
    "Materiais Escolares": ["Caderno", "Lápis", "Borracha", "Régua", "Mochila", "Livro Didático", "Caneta", "Tesoura", "Cola", "Papel Sulfite"],
    "Produtos para Animais": ["Ração para Cães", "Ração para Gatos", "Coleira", "Cama para Pet", "Brinquedo para Cães", "Shampoo para Pets", "Caixa de Areia", "Comedouro", "Bebedouro", "Vermífugo"],
    "Móveis": ["Cadeira", "Mesa", "Sofá", "Cama", "Armário", "Estante", "Poltrona", "Mesa de Centro", "Cômoda", "Banco"],
    "Eletrodomésticos": ["Geladeira", "Fogão", "Micro-ondas", "Máquina de Lavar", "Aspirador", "Liquidificador", "Torradeira", "Cafeteira", "Ferro de Passar", "Ventilador"],
    "Produtos de Limpeza": ["Detergente", "Desinfetante", "Sabão em Pó", "Amaciante", "Lustra Móveis", "Limpa Vidros", "Esponja", "Rodo", "Balde", "Vassoura"],
    "Ferramentas": ["Martelo", "Chave de Fenda", "Alicate", "Serra", "Furadeira", "Parafusadeira", "Nível", "Fita Métrica", "Marreta", "Trena"],
    "Produtos para Bebês": ["Fralda", "Mamadeira", "Chupeta", "Talco", "Óleo para Massagem", "Creme para Assaduras", "Banheirinha", "Carrinho de Bebê", "Berço", "Andador"],
    "Roupas de Cama": ["Lençol", "Travesseiro", "Edredom", "Coberta", "Colcha", "Cortina", "Toalha de Banho", "Toalha de Rosto", "Jogo de Cama", "Almofada"],
    "Utensílios de Cozinha": ["Panela", "Prato", "Copo", "Talher", "Tábua de Corte", "Liquidificador", "Batedeira", "Cafeteira", "Frigideira", "Escorredor"],
    "Produtos de Jardinagem": ["Vaso", "Semente", "Adubo", "Regador", "Pá", "Enxada", "Tesoura de Poda", "Mangueira", "Cerca", "Grama Sintética"],
    "Materiais Artísticos": ["Tinta", "Pincel", "Papel", "Lápis de Cor", "Caneta Hidrográfica", "Argila", "Tela", "Cavallet", "Paleta", "Aquarela"],
    "Produtos Eletrônicos": ["Celular", "Computador", "Televisão", "Rádio", "Fone de Ouvido", "Carregador", "Mouse", "Teclado", "Impressora", "Câmera"]
}

# Gerar SQL
sql = "-- Truncate all tables in reverse order to avoid foreign key issues\n"
tables_reverse = ["search_clicks", "search_metrics", "queries", "order_items", "orders", "customers", "products", "users", "categories", "organizations"]
for table in tables_reverse:
    sql += f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;\n"

sql += "\n-- Insert organizations\n"
for i, name in enumerate(ong_names[:40]):
    email = f"{name.lower().replace(' ', '')}@ong.com"
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"INSERT INTO organizations (name, email, password_hash, created_at) VALUES ('{name}', '{email}', '{password_hash}', '{created_at}');\n"

sql += "\n-- Insert categories\n"
for i, cat in enumerate(categories[:20]):
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"INSERT INTO categories (name, created_at) VALUES ('{cat}', '{created_at}');\n"

sql += "\n-- Insert products\n"
for i in range(40):
    cat_id = (i % 20) + 1
    org_id = (i % 40) + 1
    cat_name = categories[cat_id-1]
    prod_list = products_by_category[cat_name]
    prod = prod_list[i % len(prod_list)]
    desc = f"Produto {prod} para doação"
    price = round(random.uniform(5, 100), 2)
    # create a safe ascii image filename (remove accents and spaces)
    safe_name = unicodedata.normalize('NFKD', prod).encode('ascii', 'ignore').decode('ascii')
    safe_name = safe_name.lower().replace(' ', '')
    image_url = f"http://example.com/{safe_name}.jpg"
    stock = random.randint(10, 500)
    weight = random.randint(100, 2000)
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    # escape single quotes for SQL
    prod_esc = prod.replace("'", "''")
    desc_esc = desc.replace("'", "''")
    # include search_vector to populate full-text index
    sql += f"INSERT INTO products (name, description, price, category_id, image_url, stock_qty, weight_grams, organization_id, created_at, search_vector) VALUES ('{prod_esc}', '{desc_esc}', {price}, {cat_id}, '{image_url}', {stock}, {weight}, {org_id}, '{created_at}', to_tsvector('portuguese', '{prod_esc} ' || '{desc_esc}'));\n"

# Users: 40
sql += "\n-- Insert users\n"
sql += "INSERT INTO users (name, email, password_hash, role, organization_id, created_at) VALUES\n"
roles = ["admin", "user"]
for i in range(40):
    org_id = (i % 40) + 1
    name = f"Usuário {i+1} da ONG {org_id}"
    email = f"user{i+1}@ong{org_id}.com"
    role = random.choice(roles)
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"('{name}', '{email}', '{password_hash}', '{role}', {org_id}, '{created_at}')"
    sql += "," if i < 39 else ";"
sql += "\n"

# Customers: 40+
sql += "\n-- Insert customers\n"
sql += "INSERT INTO customers (name, email, created_at) VALUES\n"
for i in range(40):
    name = f"Cliente {i+1}"
    email = f"cliente{i+1}@example.com"
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"('{name}', '{email}', '{created_at}')"
    sql += "," if i < 39 else ";"
sql += "\n"

# Orders: 40+
sql += "\n-- Insert orders\n"
sql += "INSERT INTO orders (customer_id, created_at) VALUES\n"
for i in range(40):
    customer_id = random.randint(1, 40)
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"({customer_id}, '{created_at}')"
    sql += "," if i < 39 else ";"
sql += "\n"

# Order items: 40
sql += "\n-- Insert order_items\n"
sql += "INSERT INTO order_items (order_id, product_id, quantity, price_at_time, organization_id, created_at) VALUES\n"
for i in range(40):
    order_id = (i % 40) + 1
    product_id = (i % 40) + 1
    quantity = random.randint(1, 10)
    price = round(random.uniform(5, 100), 2)
    org_id = (i % 40) + 1
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"({order_id}, {product_id}, {quantity}, {price}, {org_id}, '{created_at}')"
    sql += "," if i < 39 else ";"
sql += "\n"

# Queries: 40+
sql += "\n-- Insert queries\n"
sql += "INSERT INTO queries (id, query_text, filters, status, created_at, updated_at) VALUES\n"
for i in range(40):
    qid = str(uuid.uuid4())
    query_text = f"Busca por {random.choice(['alimentos', 'roupas', 'brinquedos', 'livros'])}"
    filters = '{"category": "alimentos"}' if random.random() > 0.5 else '{}'
    status = random.choice(["pending", "completed", "failed"])
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    updated_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"('{qid}', '{query_text}', '{filters}', '{status}', '{created_at}', '{updated_at}')"
    sql += "," if i < 39 else ";"
sql += "\n"

# Search metrics: 40+
sql += "\n-- Insert search_metrics\n"
sql += "INSERT INTO search_metrics (id, query, ai_used, fallback_applied, results_count, zero_results, latency_ms, user_id, created_at) VALUES\n"
metrics_ids = []
for i in range(40):
    sid = str(uuid.uuid4())
    query = f"Busca {i+1}"
    ai_used = random.choice([True, False])
    fallback = random.choice([True, False])
    results = random.randint(0, 50)
    zero = results == 0
    latency = random.randint(100, 3000)
    user_id = f"user{random.randint(1,200)}@ong{random.randint(1,40)}.com"
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"('{sid}', '{query}', {ai_used}, {fallback}, {results}, {zero}, {latency}, '{user_id}', '{created_at}')"
    sql += "," if i < 39 else ";"
    metrics_ids.append(sid)
sql += "\n"

# Search clicks: 40+
sql += "\n-- Insert search_clicks\n"
sql += "INSERT INTO search_clicks (id, search_metric_id, product_id, position, created_at) VALUES\n"
for i in range(40):
    cid = str(uuid.uuid4())
    sm_id = random.choice(metrics_ids) if metrics_ids else str(uuid.uuid4())
    prod_id = random.randint(1, 40)
    position = random.randint(1, 10)
    created_at = random_date().strftime('%Y-%m-%d %H:%M:%S')
    sql += f"('{cid}', '{sm_id}', {prod_id}, {position}, '{created_at}')"
    sql += "," if i < 39 else ";"
sql += "\n"

print(sql)
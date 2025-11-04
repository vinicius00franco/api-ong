#!/bin/bash

tables=("categories" "customers" "order_items" "orders" "organizations" "products" "queries" "search_clicks" "search_metrics" "users")

for table in "${tables[@]}"; do
    echo "=== Tabela: $table ==="
    echo "Colunas:"
    docker-compose exec db psql -U user -d ong_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '$table' ORDER BY ordinal_position;"
    echo ""
    echo "Primeiros 10 registros:"
    docker-compose exec db psql -U user -d ong_db -c "SELECT * FROM $table LIMIT 10;"
    echo ""
    echo "----------------------------------------"
done
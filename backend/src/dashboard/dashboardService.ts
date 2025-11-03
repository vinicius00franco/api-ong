import { Inject, Injectable, Optional } from '@nestjs/common';
import { DashboardStats, ActivityItem } from './dashboardTypes';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { getDb } from '../lib/dbContext';

@Injectable()
export class DashboardService {
  constructor(@Optional() @Inject('DB') private readonly dbProvider?: Pool | PoolClient) {}

  private getDb() {
    // Preferir injeção, fallback para getDb() do contexto
    return this.dbProvider || getDb();
  }

  private async query(text: string, params?: any[]): Promise<QueryResult<any>> {
    const db = this.getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any).query(text, params);
  }

  async getStats(organizationId: number): Promise<DashboardStats> {

    // Estatísticas básicas
    const productsResult = await this.query(
      `SELECT COUNT(*) as count FROM products WHERE organization_id = $1`,
      [organizationId],
    );
    const totalProducts = parseInt(productsResult.rows[0].count);

    // Multi-tenant: dashboard é sempre da org logada
    const totalOrganizations = 1;

    const catsResult = await this.query(
      `SELECT COUNT(DISTINCT category_id) as count FROM products WHERE organization_id = $1`,
      [organizationId],
    );
    const totalCategories = parseInt(catsResult.rows[0].count);

    // Estatísticas de preço e inventário
    const priceStatsResult = await this.query(
      `SELECT
        COALESCE(MIN(price), 0) as min_price,
        COALESCE(MAX(price), 0) as max_price,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(SUM(price * stock_qty), 0) as total_inventory_value,
        COALESCE(SUM(stock_qty), 0) as total_stock_quantity
      FROM products
      WHERE organization_id = $1`,
      [organizationId],
    );
    const priceStats = priceStatsResult.rows[0];

    // Produtos por categoria
    const categoryStats = await this.query(
      `SELECT
        c.name as category,
        COUNT(p.id) as count,
        ROUND(COUNT(p.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM products WHERE organization_id = $1), 0), 1) as percentage
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.organization_id = $1
      GROUP BY c.id, c.name
      ORDER BY count DESC`,
      [organizationId],
    );

    // Produtos por organização
    const orgStats = await this.query(
      `SELECT
        o.name as organization,
        COUNT(p.id) as count,
        COALESCE(SUM(p.stock_qty), 0) as stock
      FROM organizations o
      LEFT JOIN products p ON o.id = p.organization_id
      WHERE o.id = $1
      GROUP BY o.id, o.name
      ORDER BY count DESC`,
      [organizationId],
    );

    // Produtos recentes
    const recentProducts = await this.query(
      `SELECT
        p.id,
        p.name,
        p.price,
        c.name as category,
        o.name as organization,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.organization_id = $1
      ORDER BY p.created_at DESC
      LIMIT 5`,
      [organizationId],
    );

    // Métricas de busca
    const searchStatsResult = await this.query(`
      SELECT
        COUNT(*) as total_searches,
        COALESCE(AVG(CASE WHEN ai_used THEN 1 ELSE 0 END) * 100, 0) as ai_usage_rate,
        COALESCE(AVG(CASE WHEN fallback_applied THEN 1 ELSE 0 END) * 100, 0) as fallback_rate,
        COALESCE(AVG(latency_ms), 0) as average_latency
      FROM search_metrics
    `);
    const searchStats = searchStatsResult.rows[0];

    return {
      totalProducts,
      totalOrganizations,
      totalCategories,
      totalInventoryValue: parseFloat(priceStats.total_inventory_value),
      averageProductPrice: parseFloat(priceStats.avg_price),
      totalStockQuantity: parseInt(priceStats.total_stock_quantity),
      productsByCategory: categoryStats.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      })),
      productsByOrganization: orgStats.rows.map(row => ({
        organization: row.organization,
        count: parseInt(row.count),
        stock: parseInt(row.stock)
      })),
      recentProducts: recentProducts.rows.map(row => ({
        id: parseInt(row.id),
        name: row.name,
        price: parseFloat(row.price),
        category: row.category,
        organization: row.organization,
        createdAt: row.created_at.toISOString()
      })),
      searchMetrics: {
        totalSearches: parseInt(searchStats.total_searches),
        aiUsageRate: parseFloat(searchStats.ai_usage_rate),
        fallbackRate: parseFloat(searchStats.fallback_rate),
        averageLatency: parseFloat(searchStats.average_latency)
      }
    };
  }

  async getRecentActivities(organizationId: number): Promise<ActivityItem[]> {

    // Atividades recentes baseadas em produtos e buscas
    const activities: ActivityItem[] = [];

    // Produtos recentes
    const recentProducts = await this.query(`
      SELECT
        'product_' || id as id,
        'Sistema' as user,
        'adicionou' as action,
        name as target,
        created_at as timestamp,
        'package' as icon,
        'product' as type
      FROM products
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `, [organizationId]);

    // Buscas recentes
    const recentSearches = await this.query(`
      SELECT
        'search_' || id as id,
        'Usuário' as user,
        'pesquisou' as action,
        query as target,
        created_at as timestamp,
        'search' as icon,
        'search' as type
      FROM search_metrics
      ORDER BY created_at DESC
      LIMIT 3
    `);

    // Combinar e ordenar por timestamp
    activities.push(
      ...recentProducts.rows.map(row => ({
        id: row.id,
        user: row.user,
        action: row.action,
        target: row.target,
        timestamp: row.timestamp.toISOString(),
        icon: row.icon,
        type: row.type as 'product' | 'search' | 'order'
      })),
      ...recentSearches.rows.map(row => ({
        id: row.id,
        user: row.user,
        action: row.action,
        target: row.target,
        timestamp: row.timestamp.toISOString(),
        icon: row.icon,
        type: row.type as 'product' | 'search' | 'order'
      }))
    );

    // Ordenar por timestamp descendente
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
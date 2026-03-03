#!/usr/bin/env python3
"""
Script de validación: Compara datos entre SQL Server y PostgreSQL.

Valida consistencia durante dual-write phase.

Uso:
    python validate_dual_write.py --days 1
"""

import argparse
import logging
import sys
from datetime import datetime, timedelta
from typing import Dict, List
import pyodbc
import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DualWriteValidator:
    """Valida consistencia entre SQL Server y PostgreSQL"""
    
    def __init__(
        self,
        sqlserver_conn_str: str,
        postgres_conn_str: str,
        tenant_id: str
    ):
        self.sqlserver_conn_str = sqlserver_conn_str
        self.postgres_conn_str = postgres_conn_str
        self.tenant_id = tenant_id
    
    def validate(self, days: int = 1) -> Dict[str, float]:
        """
        Valida consistencia de datos de los últimos N días.
        
        Returns:
            Dict con porcentajes de match: {
                'readings_match': 99.98,
                'predictions_match': 99.95,
                'total_readings_sqlserver': 10000,
                'total_readings_postgres': 9998
            }
        """
        logger.info(f"Validando datos de los últimos {days} días...")
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # 1. Validar sensor readings
        readings_stats = self._validate_readings(cutoff_date)
        
        # 2. Validar predictions
        predictions_stats = self._validate_predictions(cutoff_date)
        
        # 3. Calcular porcentajes
        results = {
            **readings_stats,
            **predictions_stats
        }
        
        self._print_report(results)
        
        return results
    
    def _validate_readings(self, cutoff_date: datetime) -> Dict:
        """Valida sensor_readings vs data_points"""
        # SQL Server
        sqlserver_conn = pyodbc.connect(self.sqlserver_conn_str)
        sqlserver_cursor = sqlserver_conn.cursor()
        
        sqlserver_cursor.execute("""
            SELECT COUNT(*) 
            FROM sensor_readings 
            WHERE timestamp >= ?
        """, cutoff_date)
        
        total_sqlserver = sqlserver_cursor.fetchone()[0]
        sqlserver_conn.close()
        
        # PostgreSQL
        postgres_conn = psycopg2.connect(self.postgres_conn_str)
        postgres_cursor = postgres_conn.cursor()
        
        postgres_cursor.execute("""
            SELECT COUNT(*) 
            FROM zenin_ts.data_points 
            WHERE tenant_id = %s 
              AND timestamp >= %s
        """, (self.tenant_id, cutoff_date))
        
        total_postgres = postgres_cursor.fetchone()[0]
        postgres_conn.close()
        
        # Calcular match percentage
        if total_sqlserver > 0:
            match_percentage = (total_postgres / total_sqlserver) * 100
        else:
            match_percentage = 100.0
        
        return {
            'readings_match_percentage': round(match_percentage, 2),
            'total_readings_sqlserver': total_sqlserver,
            'total_readings_postgres': total_postgres,
            'readings_missing': total_sqlserver - total_postgres
        }
    
    def _validate_predictions(self, cutoff_date: datetime) -> Dict:
        """Valida predictions en ambos backends"""
        # SQL Server
        sqlserver_conn = pyodbc.connect(self.sqlserver_conn_str)
        sqlserver_cursor = sqlserver_conn.cursor()
        
        sqlserver_cursor.execute("""
            SELECT COUNT(*) 
            FROM predictions 
            WHERE predicted_at >= ?
        """, cutoff_date)
        
        total_sqlserver = sqlserver_cursor.fetchone()[0]
        sqlserver_conn.close()
        
        # PostgreSQL
        postgres_conn = psycopg2.connect(self.postgres_conn_str)
        postgres_cursor = postgres_conn.cursor()
        
        postgres_cursor.execute("""
            SELECT COUNT(*) 
            FROM zenin_ml.predictions 
            WHERE tenant_id = %s 
              AND predicted_at >= %s
        """, (self.tenant_id, cutoff_date))
        
        total_postgres = postgres_cursor.fetchone()[0]
        postgres_conn.close()
        
        # Calcular match percentage
        if total_sqlserver > 0:
            match_percentage = (total_postgres / total_sqlserver) * 100
        else:
            match_percentage = 100.0
        
        return {
            'predictions_match_percentage': round(match_percentage, 2),
            'total_predictions_sqlserver': total_sqlserver,
            'total_predictions_postgres': total_postgres,
            'predictions_missing': total_sqlserver - total_postgres
        }
    
    def _print_report(self, results: Dict):
        """Imprime reporte de validación"""
        logger.info("=" * 60)
        logger.info("REPORTE DE VALIDACIÓN")
        logger.info("=" * 60)
        
        logger.info("\n📊 SENSOR READINGS:")
        logger.info(f"  SQL Server: {results['total_readings_sqlserver']:,}")
        logger.info(f"  PostgreSQL: {results['total_readings_postgres']:,}")
        logger.info(f"  Missing: {results['readings_missing']:,}")
        logger.info(f"  Match: {results['readings_match_percentage']}%")
        
        logger.info("\n🔮 PREDICTIONS:")
        logger.info(f"  SQL Server: {results['total_predictions_sqlserver']:,}")
        logger.info(f"  PostgreSQL: {results['total_predictions_postgres']:,}")
        logger.info(f"  Missing: {results['predictions_missing']:,}")
        logger.info(f"  Match: {results['predictions_match_percentage']}%")
        
        logger.info("\n" + "=" * 60)
        
        # Validar thresholds
        if results['readings_match_percentage'] < 99.0:
            logger.warning("⚠️  Readings match < 99% - Investigar discrepancias")
        else:
            logger.info("✅ Readings match OK")
        
        if results['predictions_match_percentage'] < 99.0:
            logger.warning("⚠️  Predictions match < 99% - Investigar discrepancias")
        else:
            logger.info("✅ Predictions match OK")


def main():
    parser = argparse.ArgumentParser(
        description='Validar consistencia dual-write SQL Server ↔ PostgreSQL'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=1,
        help='Número de días a validar (default: 1)'
    )
    parser.add_argument(
        '--tenant-id',
        default='00000000-0000-0000-0000-000000000001',
        help='UUID del tenant en PostgreSQL'
    )
    parser.add_argument(
        '--sqlserver-conn',
        default='DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=iot_monitoring_system;UID=sa;PWD=YourPassword',
        help='Connection string de SQL Server'
    )
    parser.add_argument(
        '--postgres-conn',
        default='host=maglev.proxy.rlwy.net port=16666 dbname=railway user=postgres password=kQamXlLJgxKAObBmmIbTHAThxabVxbtS',
        help='Connection string de PostgreSQL'
    )
    
    args = parser.parse_args()
    
    try:
        validator = DualWriteValidator(
            sqlserver_conn_str=args.sqlserver_conn,
            postgres_conn_str=args.postgres_conn,
            tenant_id=args.tenant_id
        )
        
        results = validator.validate(days=args.days)
        
        # Exit code basado en match percentage
        if (results['readings_match_percentage'] >= 99.0 and 
            results['predictions_match_percentage'] >= 99.0):
            return 0
        else:
            return 1
    
    except Exception as e:
        logger.error(f"Error durante validación: {e}", exc_info=True)
        return 2


if __name__ == '__main__':
    sys.exit(main())

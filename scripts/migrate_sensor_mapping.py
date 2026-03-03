#!/usr/bin/env python3
"""
Script de migración: Mapeo de sensores SQL Server → PostgreSQL.

Crea registros en zenin_core.legacy_sensor_mapping y zenin_ts.series
para cada sensor existente en SQL Server.

Uso:
    python migrate_sensor_mapping.py --tenant-id <uuid>
"""

import argparse
import logging
import sys
from datetime import datetime
from typing import List, Dict
import pyodbc
import psycopg2
from psycopg2.extras import execute_batch

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SensorMigrator:
    """Migra mapeo de sensores SQL Server → PostgreSQL"""
    
    def __init__(
        self,
        sqlserver_conn_str: str,
        postgres_conn_str: str,
        tenant_id: str
    ):
        self.sqlserver_conn_str = sqlserver_conn_str
        self.postgres_conn_str = postgres_conn_str
        self.tenant_id = tenant_id
    
    def migrate(self) -> Dict[str, int]:
        """
        Ejecuta migración completa.
        
        Returns:
            Dict con estadísticas: {
                'sensors_migrated': int,
                'series_created': int,
                'mappings_created': int
            }
        """
        logger.info("Iniciando migración de sensores...")
        
        # 1. Leer sensores desde SQL Server
        sensors = self._read_sensors_from_sqlserver()
        logger.info(f"Encontrados {len(sensors)} sensores en SQL Server")
        
        # 2. Crear series en PostgreSQL
        series_created = self._create_series_in_postgres(sensors)
        logger.info(f"Creadas {series_created} series en PostgreSQL")
        
        # 3. Crear mapeos
        mappings_created = self._create_mappings_in_postgres(sensors)
        logger.info(f"Creados {mappings_created} mapeos")
        
        return {
            'sensors_migrated': len(sensors),
            'series_created': series_created,
            'mappings_created': mappings_created
        }
    
    def _read_sensors_from_sqlserver(self) -> List[Dict]:
        """Lee todos los sensores activos desde SQL Server"""
        conn = pyodbc.connect(self.sqlserver_conn_str)
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                s.id AS sensor_id,
                s.sensor_uuid,
                s.sensor_type,
                s.name,
                s.unit,
                s.device_id,
                d.device_uuid,
                d.name AS device_name
            FROM sensors s
            JOIN devices d ON s.device_id = d.id
            WHERE s.is_active = 1
            ORDER BY s.id
        """
        
        cursor.execute(sql)
        
        sensors = []
        for row in cursor.fetchall():
            sensors.append({
                'sensor_id': row.sensor_id,
                'sensor_uuid': str(row.sensor_uuid),
                'sensor_type': row.sensor_type,
                'name': row.name,
                'unit': row.unit,
                'device_id': row.device_id,
                'device_uuid': str(row.device_uuid),
                'device_name': row.device_name
            })
        
        conn.close()
        return sensors
    
    def _create_series_in_postgres(self, sensors: List[Dict]) -> int:
        """Crea series en zenin_ts.series para cada sensor"""
        conn = psycopg2.connect(self.postgres_conn_str)
        cursor = conn.cursor()
        
        sql = """
            INSERT INTO zenin_ts.series 
            (tenant_id, series_key, name, description, unit, data_type, 
             source_type, source_id, metadata, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tenant_id, series_key) DO NOTHING
            RETURNING id
        """
        
        data = []
        for sensor in sensors:
            series_key = f"sensor_{sensor['sensor_id']}"
            description = f"Migrated from sensor {sensor['sensor_id']} ({sensor['sensor_type']})"
            metadata = {
                'legacy_sensor_id': sensor['sensor_id'],
                'sensor_uuid': sensor['sensor_uuid'],
                'sensor_type': sensor['sensor_type'],
                'device_id': sensor['device_id'],
                'device_uuid': sensor['device_uuid'],
                'device_name': sensor['device_name'],
                'migrated_at': datetime.utcnow().isoformat()
            }
            
            data.append((
                self.tenant_id,
                series_key,
                sensor['name'],
                description,
                sensor['unit'],
                'numeric',
                'iot_sensor',
                sensor['sensor_uuid'],
                psycopg2.extras.Json(metadata),
                True
            ))
        
        execute_batch(cursor, sql, data)
        conn.commit()
        
        created = cursor.rowcount
        conn.close()
        
        return created
    
    def _create_mappings_in_postgres(self, sensors: List[Dict]) -> int:
        """Crea mapeos en zenin_core.legacy_sensor_mapping"""
        conn = psycopg2.connect(self.postgres_conn_str)
        cursor = conn.cursor()
        
        # Primero, obtener series_id para cada sensor_key
        series_map = {}
        for sensor in sensors:
            series_key = f"sensor_{sensor['sensor_id']}"
            
            cursor.execute("""
                SELECT id FROM zenin_ts.series 
                WHERE tenant_id = %s AND series_key = %s
            """, (self.tenant_id, series_key))
            
            row = cursor.fetchone()
            if row:
                series_map[sensor['sensor_id']] = row[0]
        
        # Crear mapeos
        sql = """
            INSERT INTO zenin_core.legacy_sensor_mapping 
            (tenant_id, sensor_id, device_id, series_id, is_active)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (sensor_id, series_id) DO NOTHING
        """
        
        data = []
        for sensor in sensors:
            if sensor['sensor_id'] in series_map:
                data.append((
                    self.tenant_id,
                    sensor['sensor_id'],
                    sensor['device_id'],
                    series_map[sensor['sensor_id']],
                    True
                ))
        
        execute_batch(cursor, sql, data)
        conn.commit()
        
        created = cursor.rowcount
        conn.close()
        
        return created


def main():
    parser = argparse.ArgumentParser(
        description='Migrar mapeo de sensores SQL Server → PostgreSQL'
    )
    parser.add_argument(
        '--tenant-id',
        required=True,
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
        migrator = SensorMigrator(
            sqlserver_conn_str=args.sqlserver_conn,
            postgres_conn_str=args.postgres_conn,
            tenant_id=args.tenant_id
        )
        
        stats = migrator.migrate()
        
        logger.info("=" * 60)
        logger.info("MIGRACIÓN COMPLETADA")
        logger.info("=" * 60)
        logger.info(f"Sensores migrados: {stats['sensors_migrated']}")
        logger.info(f"Series creadas: {stats['series_created']}")
        logger.info(f"Mapeos creados: {stats['mappings_created']}")
        logger.info("=" * 60)
        
        return 0
    
    except Exception as e:
        logger.error(f"Error durante migración: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())

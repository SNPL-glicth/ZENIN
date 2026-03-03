# ZENIN - Migration & Deployment Guide

## Overview

Guía completa para migrar desde SQL Server a PostgreSQL y desplegar ZENIN en producción.

---

## 1. Pre-Migration Checklist

### 1.1 Environment Preparation

```bash
# Install required tools
sudo apt-get update
sudo apt-get install -y postgresql-16 postgresql-client-16 redis-server

# Install .NET 8 SDK
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 1.2 Database Credentials

```bash
# Create .env file
cat > .env << EOF
# PostgreSQL
POSTGRES_HOST=maglev.proxy.rlwy.net
POSTGRES_PORT=16666
POSTGRES_DB=railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=kQamXlLJgxKAObBmmIbTHAThxabVxbtS

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=$(openssl rand -base64 64)
JWT_ISSUER=ZeninAPI
JWT_AUDIENCE=ZeninClient
JWT_EXPIRY_MINUTES=60

# Application
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
CORS_ALLOWED_ORIGINS=https://zenin.app,https://www.zenin.app
EOF
```

---

## 2. Database Migration (SQL Server → PostgreSQL)

### 2.1 Schema Creation

```bash
# Connect to PostgreSQL
psql -h maglev.proxy.rlwy.net -p 16666 -U postgres -d railway

# Execute schema
\i backend/database/schema.sql

# Verify schemas
\dn

# Verify tables
\dt zenin_core.*
\dt zenin_ts.*
\dt zenin_ml.*
\dt zenin_audit.*
```

### 2.2 Data Migration Strategy

#### Option A: Full Migration (Recommended for < 100GB)

```python
# migration_script.py
import pyodbc
import psycopg2
from datetime import datetime

# SQL Server connection
mssql_conn = pyodbc.connect(
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=localhost;DATABASE=iot_monitoring_system;UID=sa;PWD=...'
)

# PostgreSQL connection
pg_conn = psycopg2.connect(
    host='maglev.proxy.rlwy.net',
    port=16666,
    database='railway',
    user='postgres',
    password='kQamXlLJgxKAObBmmIbTHAThxabVxbtS'
)

def migrate_users():
    """Migrate users table"""
    mssql_cursor = mssql_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    # Create default tenant
    pg_cursor.execute("""
        INSERT INTO zenin_core.tenants (id, name, slug, tier)
        VALUES (gen_random_uuid(), 'Default Tenant', 'default', 'enterprise')
        ON CONFLICT DO NOTHING
        RETURNING id
    """)
    tenant_id = pg_cursor.fetchone()[0]
    
    # Migrate users
    mssql_cursor.execute("SELECT id, username, email, password_hash, role, is_active, created_at FROM users")
    
    for row in mssql_cursor.fetchall():
        pg_cursor.execute("""
            INSERT INTO zenin_core.users 
            (tenant_id, email, password_hash, first_name, last_name, role, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id,
            row.email,
            row.password_hash,
            row.username.split()[0] if ' ' in row.username else row.username,
            row.username.split()[1] if ' ' in row.username else '',
            row.role,
            row.is_active,
            row.created_at
        ))
    
    pg_conn.commit()
    print(f"Migrated {mssql_cursor.rowcount} users")

def migrate_sensors_to_series():
    """Migrate sensors to universal series"""
    mssql_cursor = mssql_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    # Get tenant_id
    pg_cursor.execute("SELECT id FROM zenin_core.tenants LIMIT 1")
    tenant_id = pg_cursor.fetchone()[0]
    
    # Migrate sensors as series
    mssql_cursor.execute("""
        SELECT s.id, s.sensor_uuid, s.sensor_type, s.name, s.unit, s.is_active, s.created_at, d.id as device_id
        FROM sensors s
        JOIN devices d ON s.device_id = d.id
    """)
    
    sensor_id_map = {}  # Map SQL Server sensor_id → PostgreSQL series_id
    
    for row in mssql_cursor.fetchall():
        pg_cursor.execute("""
            INSERT INTO zenin_ts.series 
            (tenant_id, series_key, name, unit, data_type, source_type, source_id, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            tenant_id,
            f"sensor_{row.id}",  # series_key
            row.name,
            row.unit,
            'numeric',
            'iot_sensor',
            row.sensor_uuid,
            row.is_active,
            row.created_at
        ))
        
        series_id = pg_cursor.fetchone()[0]
        sensor_id_map[row.id] = series_id
    
    pg_conn.commit()
    print(f"Migrated {len(sensor_id_map)} sensors to series")
    return sensor_id_map

def migrate_sensor_readings(sensor_id_map, batch_size=10000):
    """Migrate sensor_readings to data_points (batched)"""
    mssql_cursor = mssql_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    # Get tenant_id
    pg_cursor.execute("SELECT id FROM zenin_core.tenants LIMIT 1")
    tenant_id = pg_cursor.fetchone()[0]
    
    # Get total count
    mssql_cursor.execute("SELECT COUNT(*) FROM sensor_readings")
    total = mssql_cursor.fetchone()[0]
    print(f"Total readings to migrate: {total}")
    
    # Migrate in batches
    offset = 0
    while offset < total:
        mssql_cursor.execute(f"""
            SELECT sensor_id, value, timestamp
            FROM sensor_readings
            ORDER BY id
            OFFSET {offset} ROWS
            FETCH NEXT {batch_size} ROWS ONLY
        """)
        
        batch = []
        for row in mssql_cursor.fetchall():
            if row.sensor_id in sensor_id_map:
                batch.append((
                    tenant_id,
                    sensor_id_map[row.sensor_id],
                    row.timestamp,
                    row.value
                ))
        
        if batch:
            pg_cursor.executemany("""
                INSERT INTO zenin_ts.data_points (tenant_id, series_id, timestamp, value)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, batch)
            pg_conn.commit()
        
        offset += batch_size
        print(f"Migrated {offset}/{total} readings ({offset*100//total}%)")

def migrate_predictions(sensor_id_map):
    """Migrate predictions"""
    mssql_cursor = mssql_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    # Get tenant_id
    pg_cursor.execute("SELECT id FROM zenin_core.tenants LIMIT 1")
    tenant_id = pg_cursor.fetchone()[0]
    
    # First, migrate ml_models
    mssql_cursor.execute("""
        SELECT id, sensor_id, model_name, model_type, version, is_active, trained_at, accuracy
        FROM ml_models
    """)
    
    model_id_map = {}
    for row in mssql_cursor.fetchall():
        if row.sensor_id in sensor_id_map:
            pg_cursor.execute("""
                INSERT INTO zenin_ml.models 
                (tenant_id, series_id, name, engine_name, version, is_active, trained_at, accuracy)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                tenant_id,
                sensor_id_map[row.sensor_id],
                row.model_name,
                row.model_type,
                row.version,
                row.is_active,
                row.trained_at,
                row.accuracy
            ))
            model_id_map[row.id] = pg_cursor.fetchone()[0]
    
    pg_conn.commit()
    
    # Migrate predictions
    mssql_cursor.execute("""
        SELECT model_id, sensor_id, predicted_value, confidence, predicted_at, target_timestamp,
               horizon_minutes, trend, is_anomaly, anomaly_score, risk_level, severity, explanation
        FROM predictions
    """)
    
    for row in mssql_cursor.fetchall():
        if row.model_id in model_id_map and row.sensor_id in sensor_id_map:
            pg_cursor.execute("""
                INSERT INTO zenin_ml.predictions 
                (tenant_id, model_id, series_id, predicted_value, confidence_score, 
                 predicted_at, target_timestamp, horizon_steps, trend, is_anomaly, 
                 anomaly_score, risk_level, explanation, confidence_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                tenant_id,
                model_id_map[row.model_id],
                sensor_id_map[row.sensor_id],
                row.predicted_value,
                row.confidence,
                row.predicted_at,
                row.target_timestamp,
                row.horizon_minutes,
                row.trend,
                row.is_anomaly,
                row.anomaly_score,
                row.risk_level,
                row.explanation,
                'medium'  # Default confidence level
            ))
    
    pg_conn.commit()
    print(f"Migrated predictions")

# Execute migration
if __name__ == "__main__":
    print("Starting migration...")
    migrate_users()
    sensor_id_map = migrate_sensors_to_series()
    migrate_sensor_readings(sensor_id_map)
    migrate_predictions(sensor_id_map)
    print("Migration completed!")
```

#### Option B: Incremental Migration (For large datasets)

```bash
# Use pgloader for bulk transfer
sudo apt-get install pgloader

# Create pgloader config
cat > migration.load << EOF
LOAD DATABASE
    FROM mssql://sa:password@localhost/iot_monitoring_system
    INTO postgresql://postgres:password@maglev.proxy.rlwy.net:16666/railway

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '256MB', maintenance_work_mem to '512 MB'

CAST type datetime to timestamptz drop default drop not null using zero-dates-to-null,
     type nvarchar to text drop typemod

BEFORE LOAD DO
    \$\$ DROP SCHEMA IF EXISTS public CASCADE; \$\$,
    \$\$ CREATE SCHEMA public; \$\$;
EOF

# Run migration
pgloader migration.load
```

---

## 3. Application Deployment

### 3.1 Docker Build

```bash
# Build backend
cd ZENIN/backend
docker build -t zenin-api:1.0.0 .

# Build frontend
cd ../frontend
docker build -t zenin-frontend:1.0.0 .
```

### 3.2 Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: zenin
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  api:
    build: ./backend
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=zenin;Username=postgres;Password=postgres
      - ConnectionStrings__Redis=redis:6379
      - Jwt__Secret=${JWT_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

### 3.3 Kubernetes Deployment (Production)

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: zenin

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zenin-config
  namespace: zenin
data:
  ASPNETCORE_ENVIRONMENT: "Production"
  Jwt__Issuer: "ZeninAPI"
  Jwt__Audience: "ZeninClient"
  Jwt__ExpiryMinutes: "60"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: zenin-secrets
  namespace: zenin
type: Opaque
stringData:
  postgres-connection: "Host=maglev.proxy.rlwy.net;Port=16666;Database=railway;Username=postgres;Password=kQamXlLJgxKAObBmmIbTHAThxabVxbtS"
  redis-connection: "redis-master:6379"
  jwt-secret: "YOUR_JWT_SECRET_HERE"

---
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zenin-api
  namespace: zenin
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zenin-api
  template:
    metadata:
      labels:
        app: zenin-api
    spec:
      containers:
      - name: api
        image: zenin-api:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: ConnectionStrings__DefaultConnection
          valueFrom:
            secretKeyRef:
              name: zenin-secrets
              key: postgres-connection
        - name: ConnectionStrings__Redis
          valueFrom:
            secretKeyRef:
              name: zenin-secrets
              key: redis-connection
        - name: Jwt__Secret
          valueFrom:
            secretKeyRef:
              name: zenin-secrets
              key: jwt-secret
        envFrom:
        - configMapRef:
            name: zenin-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5

---
# k8s/api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: zenin-api
  namespace: zenin
spec:
  selector:
    app: zenin-api
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: zenin-api-hpa
  namespace: zenin
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: zenin-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 3.4 Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/api-service.yaml
kubectl apply -f k8s/hpa.yaml

# Verify deployment
kubectl get pods -n zenin
kubectl get svc -n zenin

# Check logs
kubectl logs -f deployment/zenin-api -n zenin
```

---

## 4. Database Maintenance

### 4.1 Automated Partition Management

```bash
# Create cron job for monthly partition creation
cat > /etc/cron.monthly/zenin-partitions << 'EOF'
#!/bin/bash
psql -h maglev.proxy.rlwy.net -p 16666 -U postgres -d railway -c "SELECT zenin_core.create_next_month_partitions();"
psql -h maglev.proxy.rlwy.net -p 16666 -U postgres -d railway -c "SELECT zenin_core.drop_old_partitions();"
EOF

chmod +x /etc/cron.monthly/zenin-partitions
```

### 4.2 Backup Configuration

```bash
# Install pgBackRest
sudo apt-get install pgbackrest

# Configure pgBackRest
cat > /etc/pgbackrest.conf << EOF
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=30
repo1-retention-diff=7

[zenin]
pg1-host=maglev.proxy.rlwy.net
pg1-port=16666
pg1-path=/var/lib/postgresql/data
EOF

# Create full backup
pgbackrest --stanza=zenin --type=full backup

# Create incremental backup (daily cron)
cat > /etc/cron.daily/pgbackrest-backup << 'EOF'
#!/bin/bash
pgbackrest --stanza=zenin --type=incr backup
EOF

chmod +x /etc/cron.daily/pgbackrest-backup
```

### 4.3 Restore from Backup

```bash
# Stop application
kubectl scale deployment zenin-api --replicas=0 -n zenin

# Restore database
pgbackrest --stanza=zenin --type=time --target="2026-03-03 15:00:00" restore

# Start application
kubectl scale deployment zenin-api --replicas=3 -n zenin
```

---

## 5. Monitoring Setup

### 5.1 Prometheus

```yaml
# k8s/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: zenin
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    
    scrape_configs:
    - job_name: 'zenin-api'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - zenin
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: zenin-api
```

### 5.2 Grafana Dashboards

```bash
# Import pre-built dashboards
# PostgreSQL: Dashboard ID 9628
# Redis: Dashboard ID 11835
# ASP.NET Core: Dashboard ID 10915
```

---

## 6. Post-Migration Validation

### 6.1 Data Integrity Checks

```sql
-- Verify record counts
SELECT 'users' as table_name, COUNT(*) FROM zenin_core.users
UNION ALL
SELECT 'series', COUNT(*) FROM zenin_ts.series
UNION ALL
SELECT 'data_points', COUNT(*) FROM zenin_ts.data_points
UNION ALL
SELECT 'predictions', COUNT(*) FROM zenin_ml.predictions;

-- Verify latest values
SELECT s.series_key, sl.latest_value, sl.latest_timestamp
FROM zenin_ts.series s
JOIN zenin_ts.series_latest sl ON s.id = sl.series_id
ORDER BY sl.latest_timestamp DESC
LIMIT 10;

-- Verify partitions
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname IN ('zenin_ts', 'zenin_ml', 'zenin_audit')
AND tablename LIKE '%_2026%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 6.2 Performance Validation

```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM zenin_ts.data_points
WHERE series_id = 'YOUR_SERIES_ID'
AND timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC
LIMIT 100;

-- Should use index scan, execution time < 50ms
```

### 6.3 Application Health Checks

```bash
# API health
curl https://api.zenin.app/health

# Expected response:
# {
#   "status": "Healthy",
#   "checks": {
#     "postgresql": "Healthy",
#     "redis": "Healthy"
#   }
# }

# Load test
ab -n 10000 -c 100 https://api.zenin.app/api/series
```

---

## 7. Rollback Plan

### 7.1 Database Rollback

```bash
# Restore from backup
pgbackrest --stanza=zenin --type=time --target="BEFORE_MIGRATION_TIME" restore

# Verify data
psql -h maglev.proxy.rlwy.net -p 16666 -U postgres -d railway -c "SELECT COUNT(*) FROM zenin_ts.data_points;"
```

### 7.2 Application Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/zenin-api -n zenin

# Verify
kubectl rollout status deployment/zenin-api -n zenin
```

---

## 8. Troubleshooting

### 8.1 Connection Issues

```bash
# Test PostgreSQL connection
psql -h maglev.proxy.rlwy.net -p 16666 -U postgres -d railway -c "SELECT version();"

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check firewall
sudo ufw status
sudo ufw allow 5432/tcp
sudo ufw allow 6379/tcp
```

### 8.2 Performance Issues

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname IN ('zenin_ts', 'zenin_ml')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum analyze
VACUUM ANALYZE zenin_ts.data_points;
```

### 8.3 Memory Issues

```bash
# Check PostgreSQL memory
psql -c "SHOW shared_buffers;"
psql -c "SHOW work_mem;"

# Check Redis memory
redis-cli INFO memory

# Adjust if needed
# Edit postgresql.conf:
# shared_buffers = 4GB
# work_mem = 64MB
# maintenance_work_mem = 1GB
```

---

## 9. Success Criteria

- [ ] All data migrated (0% loss)
- [ ] API response time < 300ms (p95)
- [ ] Database query time < 50ms (p95)
- [ ] Redis hit rate > 85%
- [ ] Zero downtime during deployment
- [ ] All health checks passing
- [ ] Monitoring dashboards operational
- [ ] Backup/restore tested successfully
- [ ] Load test passed (10x expected traffic)
- [ ] Security audit completed

---

## 10. Support Contacts

- **Database Issues:** DBA Team
- **API Issues:** Backend Team
- **Infrastructure:** DevOps Team
- **Security:** Security Team
- **Emergency:** On-call rotation (PagerDuty)

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-03  
**Next Review:** Post-deployment (2026-03-10)

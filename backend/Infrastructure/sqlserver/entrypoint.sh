#!/bin/bash
# ZENIN: SQL Server entrypoint — starts SQL Server and runs init script

# Start SQL Server in background
/opt/mssql/bin/sqlservr &
SQLPID=$!

# Wait for SQL Server to become ready
echo "ZENIN: Waiting for SQL Server to start..."
for i in {1..60}; do
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" &>/dev/null
    if [ $? -eq 0 ]; then
        echo "ZENIN: SQL Server is ready (attempt $i)"
        break
    fi
    sleep 1
done

# Run init script
echo "ZENIN: Running init.sql..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -i /docker-entrypoint-initdb.d/init.sql

echo "ZENIN: Initialization complete"

# Wait for SQL Server process
wait $SQLPID

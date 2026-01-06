Run the following command to backup the database:
```bash
docker exec -t productfeed_db pg_dump -U productfeed -d productfeed > backend/db-backups/full-backup-$(date +%Y%m%d-%H%M%S).sql
```
set -e
node src/db/migrate.js                      
if [ "$SEED_ON_START" = "true" ]; then
  node src/db/seed.js                       
fi
exec node src/server.js                     
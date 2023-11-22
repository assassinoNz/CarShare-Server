sudo systemctl start mongod;

docker run -t -i -p 5000:5000 -v "${PWD}/test/osrm:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/sri-lanka-latest.osrm;
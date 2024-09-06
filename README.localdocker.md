
docker network create speculaas-net

docker run -it --rm -p 8000:5000 --net=speculaas-net --name finder houseofmoran/speculaas-pieces-finder:16
docker run -it --rm -p 8001:3000 --net=speculaas-net --name view houseofmoran/speculaas-pieces-view:31
docker run -it --rm -p 8002:8080 --net=speculaas-net -v ./nginx.localdocker.conf:/etc/nginx/nginx.conf:ro --name ingress nginx

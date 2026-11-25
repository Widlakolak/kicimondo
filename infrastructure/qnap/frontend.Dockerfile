FROM nginx:1.30.8-alpine-slim@sha256:e9eaa7298465eab06d618c51556fdcf3fb5061f9ff40bd28ee898fbd7ee7f900
COPY --chmod=0644 infrastructure/qnap/nginx.conf /etc/nginx/nginx.conf
COPY --chmod=0555 infrastructure/qnap/retain-assets.sh /usr/local/bin/retain-assets
COPY frontend/.vite/qnap-dist/ /usr/share/nginx/html/
RUN chmod -R a+rX /usr/share/nginx/html && mkdir -p /var/lib/kicimondo/assets && chown -R nginx:nginx /var/lib/kicimondo
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=4 CMD wget -Y off -qO /dev/null http://127.0.0.1:8080/index.html || exit 1
ENTRYPOINT ["/usr/local/bin/retain-assets"]
CMD ["nginx", "-g", "daemon off;"]

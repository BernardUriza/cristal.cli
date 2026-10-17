# CRISTAL.CLI server — Azure Container Apps image. Build from server/: docker build -t cristal-api server/
FROM quay.io/condaforge/miniforge3:26.1.1-3
SHELL ["/bin/bash", "-l", "-c"]
WORKDIR /app

COPY environment.yml .
RUN mamba clean --all --yes && mamba env update -n base -f environment.yml \
 && mamba clean --all --yes \
 && find /opt/conda/ -follow -type f -name '*.pyc' -delete

COPY app.py runner.py voice.py telemetry.py echo.py atelier.py console.py echo-denylist.txt entrypoint.sh /app/
COPY prompts /app/prompts
RUN chmod +x /app/entrypoint.sh

RUN useradd --create-home --shell /bin/bash --uid 10001 runner \
 && chown -R runner:runner /app /home/runner
USER runner
ENV HOME=/home/runner

EXPOSE 8080
CMD ["/app/entrypoint.sh"]

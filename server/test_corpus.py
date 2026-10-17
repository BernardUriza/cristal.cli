import textwrap

from fastapi import FastAPI
from fastapi.testclient import TestClient

import corpus


def write_fixture(root):
    (root / "sustancias").mkdir()
    (root / "interacciones").mkdir()
    (root / "urgencias").mkdir()
    (root / "sustancias" / "lsd.yml").write_text(textwrap.dedent('''
        id: lsd
        nombres: [LSD, ácido, dietilamida del ácido lisérgico]
        familia: psicodelico-clasico
        temporalidad: { inicio: [20, 90], pico: [120, 240], duracion: [480, 720], fuentes: [nida-lsd] }
        riesgos:
          - { texto: "ansiedad intensa y desorientación", gravedad: moderada, fuentes: [nida-lsd] }
          - { texto: "accidentes por desorientación", gravedad: grave, fuentes: [nida-lsd] }
          - { texto: "tercero que no debe salir", gravedad: leve, fuentes: [x] }
        senales_de_urgencia:
          - { texto: "convulsiones o pérdida de conciencia", fuentes: [nida-lsd] }
        acompanamiento:
          - { texto: "no quedarse solo; un lugar tranquilo y conocido", fuentes: [samhsa-1] }
        fenomenologia:
          - { texto: "el tiempo se estira", fuentes: [erowid-1] }
        fuentes:
          - { id: nida-lsd, titulo: "LSD", organismo: NIDA, url: "https://nida.nih.gov/x", publicado: 2024-01-01, revisado: 2026-10-17, tipo: ficha-oficial, confianza: alta }
    '''), encoding="utf-8")
    (root / "interacciones" / "lsd.yml").write_text(textwrap.dedent('''
        sustancia: lsd
        interacciones:
          - { con: litio, clase: medicamento, mecanismo: "desconocido", riesgo: "convulsiones reportadas", gravedad: grave, evidencia: reportes-de-caso, fuentes: [pmid-1] }
    '''), encoding="utf-8")
    (root / "urgencias" / "senales.yml").write_text(textwrap.dedent('''
        senales:
          - id: panico
            patrones: ["me voy a morir", "panico", "no puedo respirar bien"]
            senal: "pánico"
            accion: atencion
            que_decir: "Respira conmigo. Estás aquí y esto pasa."
            fuentes: [samhsa-1]
          - id: convulsion
            patrones: ["convuls", "se esta sacudiendo"]
            senal: "convulsión"
            accion: urgente
            que_decir: "Llama al 911 ahora. Ponlo de lado."
            fuentes: [nida-lsd]
        reglas_de_voz:
          - { regla: "no diagnosticar", porque: "...", fuentes: [x] }
    '''), encoding="utf-8")
    return corpus.load_corpus(root)


def test_detects_substances_by_any_name_without_accents_and_as_whole_words(tmp_path):
    c = write_fixture(tmp_path)
    assert corpus.detect_substances("me tomé un acido hace una hora", c) == ["lsd"]
    assert corpus.detect_substances("tomé LSD", c) == ["lsd"]
    assert corpus.detect_substances("el ácido del estómago", c) == ["lsd"]
    assert corpus.detect_substances("nada que ver", c) == []


def test_safety_signals_are_deterministic_and_urgent_first(tmp_path):
    c = write_fixture(tmp_path)
    hits = corpus.check_signals("tengo pánico y mi amigo se está sacudiendo", c)
    assert [h.id for h in hits] == ["convulsion", "panico"]
    assert hits[0].que_decir.startswith("Llama al 911")


def test_context_is_short_sourced_and_labels_phenomenology(tmp_path):
    c = write_fixture(tmp_path)
    ctx = corpus.context_for("tomé ácido y estoy con litio", c)
    assert "inicio 20–90 min" in ctx and "[nida-lsd]" in ctx
    assert "qué ayuda ahora: no quedarse solo" in ctx
    assert "fenomenología (descripción, no hecho universal)" in ctx
    assert "interacción con litio" in ctx
    assert "tercero que no debe salir" not in ctx
    assert len(ctx) <= corpus.MAX_CONTEXT_CHARS
    assert corpus.context_for("hola", c) == ""


def test_http_surface(tmp_path, monkeypatch):
    monkeypatch.setenv("CRISTAL_CORPUS_PATH", str(tmp_path))
    write_fixture(tmp_path)
    corpus.corpus.cache_clear()
    app = FastAPI()
    app.include_router(corpus.router)
    client = TestClient(app)
    assert client.get("/corpus/sustancias").json()["sustancias"][0]["id"] == "lsd"
    assert client.get("/corpus/sustancias/lsd").json()["interacciones"][0]["con"] == "litio"
    assert client.get("/corpus/sustancias/nada").status_code == 404
    body = client.post("/corpus/check", json={"text": "tomé ácido y me voy a morir"}).json()
    assert body["sustancias"] == ["lsd"] and body["senales"][0]["id"] == "panico" and "nida-lsd" in body["contexto"]
    corpus.corpus.cache_clear()

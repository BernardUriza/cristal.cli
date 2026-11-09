"""Plays the published labyrinth with the real keyboard, from the spawn to EL VELADOR's answer.

Production has no DEV handles, so the pilot steers by the minimap: it reads the player's dot and
heading from the SVG and turns with the arrow keys towards each cell of the route. It prints one
JSON line: when /console/warm and /console/turn went out and came back, how many cells were lit,
and how long the answer took. Two screenshots land in the folder given as the first argument.

    <a venv with playwright>/bin/python web/scripts/pilot_velador.py <out_dir> [url]

ROUTE is the shortest path from the spawn cell to EL VELADOR in the seeded maze; if the maze or
his cell changes, recompute it with shortestPath (web/src/game/mazeGraph.ts).
"""
import sys, json, time, math
from playwright.sync_api import sync_playwright
out = sys.argv[1]
URL = sys.argv[2] if len(sys.argv) > 2 else "https://cristal.bernarduriza.com/laberinto.html"
ROUTE = [[4,4],[4,3],[3,3],[3,2],[3,1],[3,0],[4,0],[4,1],[4,2],[5,2],[6,2],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[6,7]]
POSE = """() => { const svg = document.querySelector('.minimap svg'); if (!svg) return null;
  const cs = svg.querySelectorAll('circle'); const c = cs[cs.length-1]; const ls = svg.querySelectorAll(':scope > line'); const l = ls[ls.length-1];
  return {x:+c.getAttribute('cx'), z:+c.getAttribute('cy'), hx:+l.getAttribute('x2')-+l.getAttribute('x1'), hz:+l.getAttribute('y2')-+l.getAttribute('y1'),
          prompt: document.querySelector('.prompt')?.innerText ?? '', meter: document.querySelector('.trail-meter')?.textContent ?? ''}; }"""
log = {"events": []}
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    t0 = time.time()
    def on_req(r):
        if "/console/" in r.url: log["events"].append([round(time.time()-t0,1), "req", r.url.split("/console/")[1]])
    def on_done(r):
        if "/console/" in r.url: log["events"].append([round(time.time()-t0,1), "done", r.url.split("/console/")[1]])
    pg.on("request", on_req); pg.on("requestfinished", on_done)
    pg.goto(URL)
    pg.wait_for_selector(".minimap svg", timeout=40000); time.sleep(4)
    kb = pg.keyboard; walking = False
    def walk(on):
        global walking
        if on and not walking: kb.down("KeyW")
        if not on and walking: kb.up("KeyW")
        walking = on
    found = False; deadline = time.time() + 170
    for wx, wy in ROUTE[1:]:
        tx, tz = wx*18+9, wy*18+9
        while time.time() < deadline:
            s = pg.evaluate(POSE)
            if s is None: break
            if "VELADOR" in s["prompt"]: found = True; break
            dx, dz = tx - s["x"], tz - s["z"]
            if math.hypot(dx, dz) < 6.5: break
            err = math.atan2(dx, dz) - math.atan2(s["hx"], s["hz"])
            err = math.atan2(math.sin(err), math.cos(err))
            if abs(err) > 0.3:
                walk(False); k = "ArrowLeft" if err > 0 else "ArrowRight"
                kb.down(k); time.sleep(min(0.7, abs(err)/2.4)); kb.up(k); time.sleep(0.12)
            else:
                walk(True)
                if abs(err) > 0.08:
                    k = "ArrowLeft" if err > 0 else "ArrowRight"; kb.down(k); time.sleep(0.04); kb.up(k)
                time.sleep(0.08)
        if found: break
    walk(False); time.sleep(1.0)
    s = pg.evaluate(POSE)
    log["arrived_s"] = round(time.time()-t0,1); log["found"] = found or (s and "VELADOR" in s["prompt"]); log["meter"] = s["meter"] if s else None
    pg.screenshot(path=out + "/09-prod-llegada-al-velador.png")
    if log["found"]:
        kb.press("Enter"); time.sleep(1.2)
        kb.type("llevo horas aqui y no se que siento", delay=40)
        sent = time.time(); kb.press("Enter")
        ans = None
        while time.time() - sent < 80:
            lines = pg.evaluate("() => [...document.querySelectorAll('.npc-overlay .line.voice')].map(e => e.textContent)")
            if len(lines) >= 2 and len(lines[-1]) > 8:
                if ans is None: log["first_text_s"] = round(time.time()-sent,1)
                ans = lines[-1]
                if any(e[1]=="done" and e[2]=="turn" for e in log["events"]): break
            time.sleep(0.25)
        log["answer"] = ans; log["answer_s"] = round(time.time()-sent,1)
        pg.screenshot(path=out + "/10-prod-respuesta-del-velador.png")
    print(json.dumps(log, ensure_ascii=False))
    b.close()

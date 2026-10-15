/* cr34te.it — die Zeichnung ist mit Tinte gemacht, also darf man mit Tinte
   hineinschreiben. Jeder Tipp setzt einen Klecks; mehr als sechs bleiben
   nicht liegen, damit das Blatt nicht zuläuft.
   Kein Speicher, kein Netz, keine Fremddatei: der Klecks ist ein Element
   im Dokument und wird über das Stylesheet gesetzt. */
(function () {
  "use strict";

  var MAX = 6;
  var blots = [];
  var hinweis = document.querySelector(".hinweis");
  var hinweisWeg = false;

  function zufall(min, max) {
    return min + Math.random() * (max - min);
  }

  function setzeKlecks(x, y) {
    var groesse = zufall(16, 46);
    var blot = document.createElement("span");
    blot.className = "klecks";
    /* Die Lage kommt über das Stylesheet, nicht über ein style-Attribut:
       die Seite verbietet eingebettete Stile. */
    blot.style.setProperty("--durchmesser", groesse.toFixed(1) + "px");
    blot.style.setProperty("--drehung", zufall(-25, 25).toFixed(1) + "deg");
    blot.style.left = x + "px";
    blot.style.top = y + "px";
    document.body.appendChild(blot);
    blots.push(blot);
    while (blots.length > MAX) {
      blots.shift().remove();
    }
  }

  function versteckeHinweis() {
    if (hinweisWeg || !hinweis) return;
    hinweisWeg = true;
    hinweis.classList.add("weg");
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    versteckeHinweis();
    setzeKlecks(event.clientX, event.clientY);
  }, { passive: true });

  /* Tastatur: die Mitte des Blattes bekommt einen Klecks, damit auch ohne
     Zeigegerät etwas passiert. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.target !== document.body) return;
    versteckeHinweis();
    setzeKlecks(window.innerWidth / 2 + zufall(-30, 30),
                window.innerHeight / 2 + zufall(-30, 30));
  });
}());

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

  /* Die Aubergine unter dem Bauch des Pferdes: in derselben schwarzen Tinte
     gezeichnet, nur Linien und Schraffur. Sie liegt als SVG über dem Bild. */
  function zeichneAubergine() {
    var bild = document.querySelector(".bild");
    if (!bild || !bild.parentNode) return;
    var rahmen = document.createElement("span");
    rahmen.className = "zeichnung";
    bild.parentNode.insertBefore(rahmen, bild);
    rahmen.appendChild(bild);
    rahmen.insertAdjacentHTML("beforeend",
      "<svg class='aubergine' viewBox='0 0 60 100' aria-hidden='true' focusable='false' " +
      "fill='none' stroke='#14100e' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M30 19 C19 23 9 46 12 72 C15 91 37 97 45 79 C53 60 46 29 30 19 Z'/>" +
      "<path d='M30 19 L17 23 L25 28 L30 21 L36 29 L44 23 Z'/>" +
      "<path d='M30 19 C30 11 33 6 37 3'/>" +
      "<path d='M20 42 C17 53 18 63 21 71' stroke-width='1.6'/>" +
      "<path d='M36 40 L42 36 M36 50 L45 44 M35 60 L46 53 M34 70 L44 63 M34 79 L40 74' stroke-width='1.4'/>" +
      "</svg>");
  }

  zeichneAubergine();

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

// Presentation and little browser-only toys. Portfolio content stays in index.html.
(() => {
  const eras = [
    {
      id: "terminal",
      year: 1977,
      name: "Terminal",
      color: "#09170f",
      banner: "aayush / home directory",
      palette: ["#09170f", "#10261a", "#adf7a5", "#9edf9d", "#76a582"],
    },
    {
      id: "synthwave",
      year: 1984,
      name: "Synthwave",
      color: "#0c0923",
      banner: "1984 / SYNTHWAVE EDITION",
      palette: ["#0c0923", "#160d2e", "#ffbf74", "#f5ecff", "#a78ab9"],
    },
    {
      id: "geocities",
      year: 1998,
      name: "GeoCities",
      color: "#18133e",
      banner: "WELCOME TO MY HOMEPAGE",
      palette: ["#fff6d7", "#e9ddff", "#ffdb5d", "#261843", "#82709d"],
    },
    {
      id: "desktop",
      year: 2004,
      name: "Desktop",
      color: "#2e638f",
      banner: "Aayush Marasini — Home",
      palette: ["#e7e9ee", "#f5f5f7", "#ffcf75", "#172d46", "#708296"],
    },
    {
      id: "metro",
      year: 2012,
      name: "Metro",
      color: "#f5f7fb",
      banner: "RESEARCH / PROJECTS / PEOPLE",
      palette: ["#f5f7fb", "#e6edf7", "#f5ab52", "#163556", "#6d8197"],
    },
    {
      id: "modern",
      year: 2026,
      name: "Modern",
      color: "#c6e9e8",
      banner: "",
      palette: ["#c6e9e8", "#ccc2e8", "#fa8251", "#202825", "#657873"],
    },
  ];
  const root = document.documentElement;
  const panel = document.querySelector("#time-machine");
  const panelToggle = document.querySelector("#time-machine-toggle");
  const slider = document.querySelector("#era-slider");
  const output = document.querySelector("#era-label");
  const trigger = document.querySelector("#artifact-trigger");
  const dialog = document.querySelector("#easter-dialog");
  const content = document.querySelector("#easter-content");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (!panel || !panelToggle || !slider || !dialog) return;

  let current = 5;
  let requested = 5;
  let latestValue = 100;
  let revision = 0;
  let activeTransition;
  let announcementTimer;
  let gameCleanup = () => {};
  const stamps = [];
  try {
    const saved = eras.findIndex(
      (era) => era.id === sessionStorage.getItem("portfolio-era"),
    );
    if (saved >= 0) current = requested = saved;
  } catch {
    /* Storage is optional. */
  }

  const channels = (hex) =>
    hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16));
  function blendPalette(value) {
    const position = value / 20;
    const low = Math.floor(position);
    const high = Math.min(5, low + 1);
    // Dark/light palettes crossfade as complete frames: mixing their text and
    // paper colors directly would create an unreadable grey midpoint.
    const fraction = low === 1 ? (position < 1.5 ? 0 : 1) : position - low;
    ["--cyan", "--purple", "--orange", "--ink", "--rule"].forEach(
      (property, i) => {
        const a = channels(eras[low].palette[i]);
        const b = channels(eras[high].palette[i]);
        root.style.setProperty(
          property,
          `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * fraction)).join(" ")})`,
        );
      },
    );
  }

  function render(index) {
    current = index;
    const era = eras[index];
    root.dataset.era = era.id;
    document.querySelector('meta[name="theme-color"]').content = era.color;
    document.querySelector("#era-banner-text").textContent = era.banner;
    trigger.setAttribute(
      "aria-label",
      `Explore the ${era.year} ${era.name} easter egg`,
    );
    const artifacts = [
      ["TERMINAL", "A few commands. Nothing to install."],
      ["AM—04", "Four notes. Keyboard: A / S / D / F."],
      ["GUESTBOOK", "Leave a stamp while you're here."],
      ["SCREENSAVER", "Waiting for it to hit the corner."],
      ["MEMORY", "Three pairs to find."],
      ["SHARED MEMORY", "Click the circuit. Take a penalty."],
    ];
    document.querySelector("#artifact-label").textContent = artifacts[index][0];
    document.querySelector("#artifact-caption").textContent =
      artifacts[index][1];
    try {
      sessionStorage.setItem("portfolio-era", era.id);
    } catch {
      /* Optional. */
    }
  }

  function choose(value, animate = true) {
    latestValue = value;
    const index = Math.max(0, Math.min(5, Math.round(value / 20)));
    const era = eras[index];
    slider.style.setProperty("--dial-position", `${value}%`);
    output.textContent = `${era.year} / ${era.name}`;
    slider.setAttribute("aria-valuetext", `${era.year}, ${era.name}`);
    if (requested === index && root.dataset.era === era.id) {
      blendPalette(value);
      return;
    }
    requested = index;
    const version = ++revision;
    activeTransition?.skipTransition();
    const update = () => {
      if (version === revision) {
        blendPalette(latestValue);
        render(index);
      }
    };
    if (
      animate &&
      !reducedMotion.matches &&
      typeof document.startViewTransition === "function"
    ) {
      root.dataset.transitioning = "true";
      const transition = document.startViewTransition(update);
      activeTransition = transition;
      transition.ready.catch(() => {});
      transition.finished
        .catch(() => {})
        .finally(() => {
          if (version === revision) {
            delete root.dataset.transitioning;
            activeTransition = undefined;
          }
        });
    } else {
      update();
      delete root.dataset.transitioning;
    }
  }

  slider.value = String(current * 20);
  render(current);
  choose(Number(slider.value), false);
  panelToggle.hidden = false;
  trigger.disabled = false;
  root.dataset.timeMachineReady = "true";

  // The optional panel stays put while open. The page itself stays unobstructed.
  let drag;
  let panelScrollY = scrollY;
  function closePanel(restoreFocus = false) {
    if (panel.hidden) return;
    releaseDial();
    activeTransition?.skipTransition();
    panel.hidden = true;
    panelToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) panelToggle.focus({ preventScroll: true });
  }
  panelToggle.addEventListener("click", () => {
    if (!panel.hidden) {
      closePanel();
      return;
    }
    const anchor = panelToggle.getBoundingClientRect();
    const width = Math.min(360, innerWidth - 24);
    const height = 116;
    const left = Math.max(12, Math.min(anchor.left, innerWidth - width - 12));
    const top =
      anchor.bottom + 8 + height <= innerHeight - 12
        ? anchor.bottom + 8
        : Math.max(12, anchor.top - height - 8);
    panel.style.setProperty("--panel-left", `${left}px`);
    panel.style.setProperty("--panel-top", `${top}px`);
    panelScrollY = scrollY;
    panel.hidden = false;
    panelToggle.setAttribute("aria-expanded", "true");
    slider.focus({ preventScroll: true });
  });
  document
    .querySelector("#close-time-machine")
    .addEventListener("click", () => closePanel(true));
  document.addEventListener("pointerdown", (event) => {
    if (!panel.contains(event.target) && !panelToggle.contains(event.target))
      closePanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      closePanel(true);
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      // A scroll that brought the trigger into view may still have a queued event.
      // Dismiss only when the viewport actually moves after the panel opens.
      if (panel.hidden || drag) panelScrollY = scrollY;
      else if (Math.abs(scrollY - panelScrollY) > 1) closePanel();
    },
    { passive: true },
  );
  window.addEventListener("resize", () => closePanel(true));

  // Pointer coordinates remain independent of changes to the chosen era's layout.
  function moveDial(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const fraction = (event.clientX - drag.left - 6.5) / (drag.width - 13);
    slider.value = String(Math.max(0, Math.min(100, fraction * 100)));
    slider.dispatchEvent(new Event("input"));
  }
  function releaseDial() {
    if (!drag) return;
    if (slider.hasPointerCapture(drag.pointerId))
      slider.releasePointerCapture(drag.pointerId);
    drag = undefined;
    slider.dispatchEvent(new Event("change"));
  }
  slider.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    slider.focus({ preventScroll: true });
    const track = slider.getBoundingClientRect();
    drag = { pointerId: event.pointerId, left: track.left, width: track.width };
    slider.setPointerCapture(event.pointerId);
    moveDial(event);
  });
  window.addEventListener("pointermove", moveDial);
  window.addEventListener("pointerup", (event) => {
    moveDial(event);
    releaseDial();
  });
  window.addEventListener("pointercancel", releaseDial);
  window.addEventListener("blur", releaseDial);

  slider.addEventListener("input", () => choose(Number(slider.value)));
  slider.addEventListener("change", () => {
    slider.value = String(Math.round(Number(slider.value) / 20) * 20);
    choose(Number(slider.value));
    clearTimeout(announcementTimer);
    announcementTimer = setTimeout(() => {
      document.querySelector("#era-announcement").textContent =
        `${eras[requested].year} ${eras[requested].name} selected.`;
    }, 200);
  });
  slider.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = 100;
    if (["ArrowLeft", "ArrowDown", "PageDown"].includes(event.key))
      next = Math.max(0, Math.round(Number(slider.value) / 20) * 20 - 20);
    if (["ArrowRight", "ArrowUp", "PageUp"].includes(event.key))
      next = Math.min(100, Math.round(Number(slider.value) / 20) * 20 + 20);
    if (next !== undefined) {
      event.preventDefault();
      slider.value = String(next);
      slider.dispatchEvent(new Event("input"));
      slider.dispatchEvent(new Event("change"));
    }
  });

  // Each toy gets its own cleanup when the dialog closes. No tracking or network calls.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, action, className = "toy-button") {
    const node = element("button", className, text);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function gameStatus(text) {
    const status = element("p", "toy-status", text);
    status.setAttribute("role", "status");
    return status;
  }
  function heading(title, description) {
    document.querySelector("#easter-title").textContent = title;
    document.querySelector("#easter-description").textContent = description;
  }

  function terminal() {
    heading("A small terminal.", "Try help, whoami, ls, or cat hello.txt.");
    const log = element(
      "pre",
      "terminal-output",
      "PORTFOLIO OS 1.0\nConnected to absolutely nothing.\nType help to get started.",
    );
    log.setAttribute("aria-live", "polite");
    const form = element("form", "terminal-form");
    const label = element("label", "", ">");
    label.htmlFor = "terminal-command";
    const input = element("input");
    input.id = "terminal-command";
    input.setAttribute("aria-label", "Terminal command");
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 80;
    const run = button("Run", () => form.requestSubmit());
    form.append(label, input, run);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const command = input.value.trim().toLowerCase();
      const replies = {
        help: "help  whoami  ls  cat hello.txt  clear",
        whoami:
          "Aayush Marasini\nComputer Engineering. Real Madrid. Usually debugging something.",
        ls: "research/   projects/   hello.txt",
        "cat hello.txt":
          "hello, world.\nThe best part of a computer is that you can make it do things.",
        sudo: "Nice try. This is still a website.",
      };
      if (command === "clear") log.textContent = "";
      else
        log.textContent =
          `${log.textContent}\n> ${input.value}\n${replies[command] || "Command not found. Try help."}`.slice(
            -3000,
          );
      input.value = "";
      log.scrollTop = log.scrollHeight;
    });
    content.append(log, form);
  }

  function synthesizer() {
    heading(
      "Four notes. No rules.",
      "Click a key, or play A, S, D, F. Sound starts only when you play.",
    );
    const keys = element("div", "synth-keys");
    const status = gameStatus("Ready when you are.");
    const notes = [
      ["C", "A", 261.63],
      ["D", "S", 293.66],
      ["E", "D", 329.63],
      ["G", "F", 392],
    ];
    let audio;
    let alive = true;
    let muted = false;
    const timers = new Set();
    async function play(index) {
      const key = keys.children[index];
      key.classList.add("is-playing");
      const timer = setTimeout(() => {
        key.classList.remove("is-playing");
        timers.delete(timer);
      }, 250);
      timers.add(timer);
      status.textContent = `Playing ${notes[index][0]}.`;
      if (muted) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error("Audio unavailable");
        audio ||= new Audio();
        if (audio.state === "suspended") await audio.resume();
        if (!alive) return;
        const oscillator = audio.createOscillator();
        const envelope = audio.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = notes[index][2];
        envelope.gain.setValueAtTime(0, audio.currentTime);
        envelope.gain.linearRampToValueAtTime(0.12, audio.currentTime + 0.02);
        envelope.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + 0.45,
        );
        oscillator.connect(envelope).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.5);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      } catch {
        status.textContent =
          "Audio is unavailable here. The keys still light up.";
      }
    }
    notes.forEach(([note, letter], i) =>
      keys.append(button(`${note} / ${letter}`, () => play(i), "synth-key")),
    );
    const mute = button("Mute sound", () => {
      muted = !muted;
      mute.textContent = muted ? "Enable sound" : "Mute sound";
      mute.setAttribute("aria-pressed", String(muted));
      if (muted) audio?.suspend();
    });
    mute.setAttribute("aria-pressed", "false");
    const keydown = (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      const index = notes.findIndex(
        (note) => note[1].toLowerCase() === event.key.toLowerCase(),
      );
      if (index >= 0) {
        event.preventDefault();
        play(index);
      }
    };
    dialog.addEventListener("keydown", keydown);
    content.append(keys, mute, status);
    gameCleanup = () => {
      alive = false;
      timers.forEach(clearTimeout);
      dialog.removeEventListener("keydown", keydown);
      audio?.close().catch(() => {});
    };
  }

  function guestbook() {
    heading(
      "You found the guestbook.",
      "Leave a stamp. It stays here only until you close or reload this page.",
    );
    const choices = element("div", "stamp-choices");
    const wall = element("div", "stamp-wall");
    wall.setAttribute("aria-label", "Guestbook stamps");
    const status = gameStatus(
      "No email. Just a little mark that you were here.",
    );
    const draw = () =>
      wall.replaceChildren(
        ...stamps.map((stamp) => element("span", "guest-stamp", stamp)),
      );
    [
      ["★", "Star"],
      ["♥", "Heart"],
      ["☺", "Smiley"],
      ["✿", "Flower"],
    ].forEach(([stamp, name]) => {
      const choice = button(stamp, () => {
        stamps.push(stamp);
        if (stamps.length > 16) stamps.shift();
        draw();
        status.textContent = `${name} added to the guestbook.`;
      });
      choice.setAttribute("aria-label", `Leave a ${name.toLowerCase()} stamp`);
      choices.append(choice);
    });
    draw();
    content.append(choices, wall, status);
  }

  function screensaver() {
    heading(
      "DVD Video",
      reducedMotion.matches
        ? "Motion is off by default. Press Start screensaver to play."
        : "Catch the logo. Or wait for the corner.",
    );
    const stage = element("div", "dvd-stage");
    let catches = 0;
    const status = gameStatus("0 catches");
    const logo = button(
      "DVD",
      () => {
        catches++;
        status.textContent = `${catches} ${catches === 1 ? "catch" : "catches"}.`;
      },
      "dvd-logo",
    );
    logo.setAttribute("aria-label", "Catch the DVD logo");
    logo.append(element("span", "dvd-video", "VIDEO"));
    stage.append(logo);
    let paused = reducedMotion.matches;
    let frame;
    let previous = 0;
    let x = 12,
      y = 18,
      dx = 100,
      dy = 75,
      color = 0;
    let maxX = 0,
      maxY = 0;
    const colors = ["#87f5ea", "#ffb5e8", "#ffdf8b", "#b4aaff", "#a5ed9d"];
    const draw = () => {
      logo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const measure = () => {
      maxX = Math.max(0, stage.clientWidth - logo.offsetWidth);
      maxY = Math.max(0, stage.clientHeight - logo.offsetHeight);
      x = Math.min(x, maxX);
      y = Math.min(y, maxY);
      draw();
    };
    function tick(now) {
      frame = undefined;
      if (paused || !dialog.open || document.hidden) return;
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      x += dx * delta;
      y += dy * delta;
      let hit = false;
      if (x < 0 || x > maxX) {
        x = Math.max(0, Math.min(maxX, x));
        dx *= -1;
        hit = true;
      }
      if (y < 0 || y > maxY) {
        y = Math.max(0, Math.min(maxY, y));
        dy *= -1;
        hit = true;
      }
      if (hit) logo.style.color = colors[++color % colors.length];
      draw();
      frame = requestAnimationFrame(tick);
    }
    function start() {
      cancelAnimationFrame(frame);
      previous = 0;
      measure();
      if (!paused && !document.hidden) frame = requestAnimationFrame(tick);
    }
    const pause = button(paused ? "Start screensaver" : "Pause motion", () => {
      paused = !paused;
      pause.textContent = paused ? "Resume motion" : "Pause motion";
      pause.setAttribute("aria-pressed", String(paused));
      if (paused) cancelAnimationFrame(frame);
      else start();
    });
    pause.setAttribute("aria-pressed", String(paused));
    content.append(stage, pause, status);
    // Measure after showModal, when the stage has a real size.
    frame = requestAnimationFrame(start);
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    const visibility = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    };
    const preference = () => {
      if (reducedMotion.matches) {
        paused = true;
        cancelAnimationFrame(frame);
        pause.textContent = "Start screensaver";
        pause.setAttribute("aria-pressed", "true");
      }
    };
    document.addEventListener("visibilitychange", visibility);
    reducedMotion.addEventListener("change", preference);
    gameCleanup = () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reducedMotion.removeEventListener("change", preference);
    };
  }

  function memoryGame() {
    heading("A little memory test.", "Find the three matching pairs.");
    const symbols = ["CPU", "RAM", "I/O", "CPU", "RAM", "I/O"];
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }
    const grid = element("div", "memory-game");
    const status = gameStatus("0 / 3 pairs found.");
    let opened = [];
    let pairs = 0;
    let locked = false;
    let timer;
    symbols.forEach((symbol, index) => {
      const card = button(
        "?",
        () => {
          if (
            locked ||
            card.dataset.revealed === "true" ||
            card.dataset.matched === "true"
          )
            return;
          card.textContent = symbol;
          card.dataset.revealed = "true";
          card.setAttribute("aria-label", `Card ${index + 1}: ${symbol}`);
          opened.push(card);
          if (opened.length < 2) return;
          if (opened[0].textContent === opened[1].textContent) {
            opened.forEach((node) => {
              node.dataset.matched = "true";
              node.setAttribute(
                "aria-label",
                `${node.getAttribute("aria-label")}, matched`,
              );
            });
            pairs++;
            status.textContent =
              pairs === 3
                ? "3 / 3. Memory restored."
                : `${pairs} / 3 pairs found.`;
            opened = [];
          } else {
            locked = true;
            timer = setTimeout(() => {
              opened.forEach((node) => {
                node.textContent = "?";
                node.dataset.revealed = "false";
                node.setAttribute(
                  "aria-label",
                  `Reveal card ${Number(node.dataset.index) + 1}`,
                );
              });
              opened = [];
              locked = false;
            }, 800);
          }
        },
        "memory-card",
      );
      card.dataset.index = String(index);
      card.setAttribute("aria-label", `Reveal card ${index + 1}`);
      grid.append(card);
    });
    content.append(grid, status);
    gameCleanup = () => clearTimeout(timer);
  }

  function football() {
    heading("One quick penalty.", "Pick a corner. Or trust the middle.");
    const pitch = element("div", "penalty-pitch");
    pitch.setAttribute("aria-hidden", "true");
    pitch.append(
      element("div", "goal-net"),
      element("div", "goalkeeper", "▰"),
      element("div", "football", "●"),
    );
    const controls = element("div", "shot-controls");
    const status = gameStatus("Your shot.");
    let goals = 0;
    let shots = 0;
    let timer;
    ["Left", "Middle", "Right"].forEach((direction, index) =>
      controls.append(
        button(direction, () => {
          clearTimeout(timer);
          const save = Math.floor(Math.random() * 3);
          const goal = index !== save;
          shots++;
          if (goal) goals++;
          pitch.classList.remove("shot");
          void pitch.offsetWidth;
          pitch.style.setProperty("--shot-x", `${(index - 1) * 75}px`);
          pitch.style.setProperty("--keeper-x", `${(save - 1) * 65}px`);
          pitch.classList.add("shot");
          status.textContent = `${goal ? "Goal. Hala Madrid!" : "Saved. Go again."} ${goals} / ${shots} scored.`;
          timer = setTimeout(() => pitch.classList.remove("shot"), 1200);
        }),
      ),
    );
    content.append(pitch, controls, status);
    gameCleanup = () => clearTimeout(timer);
  }

  trigger.addEventListener("click", () => {
    activeTransition?.skipTransition();
    gameCleanup();
    gameCleanup = () => {};
    content.replaceChildren();
    const era = eras[current];
    document.querySelector("#easter-era").textContent =
      `${era.year} / ${era.name}`;
    [terminal, synthesizer, guestbook, screensaver, memoryGame, football][
      current
    ]();
    dialog.showModal();
  });
  document
    .querySelector("#close-easter")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    gameCleanup();
    gameCleanup = () => {};
  });
})();

// Original mode: a spinner that randomly appears/disappears and a cursor that jumps around
function createSpinnerMode() {
    const loader = document.getElementById('loader');
    const cursor = document.getElementById('cursor');
    let loaderTimer = null;
    let cursorTimer = null;

    function toggleLoader() {
        const isVisible = loader.style.display === 'block';
        loader.style.display = isVisible ? 'none' : 'block';
    }

    function randomToggleLoader() {
        toggleLoader();
        const randomInterval = Math.random() * 5000 + 1000; // Random interval between 1 and 6 seconds
        loaderTimer = setTimeout(randomToggleLoader, randomInterval);
    }

    function moveCursor() {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
    }

    return {
        start() {
            randomToggleLoader();
            cursorTimer = setInterval(moveCursor, 1000);
        },
        stop() {
            clearTimeout(loaderTimer);
            clearInterval(cursorTimer);
            loader.style.display = 'none';
        }
    };
}

// Mode switching: a random different mode every 2 minutes.
// Debug helpers: ?mode=lasers|strings|spinner pins a mode, ?interval=<seconds> changes the delay.
(function () {
    const SWITCH_SECONDS = 2 * 60;
    const arenaCanvas = document.getElementById('arena');

    const modes = {
        spinner: createSpinnerMode(),
        lasers: Arena.create(arenaCanvas, 'lasers'),
        strings: Arena.create(arenaCanvas, 'strings')
    };
    const names = Object.keys(modes);
    const params = new URLSearchParams(location.search);
    let current = null;

    function setMode(name) {
        if (current) modes[current].stop();
        current = name;
        document.body.dataset.mode = name;
        modes[name].start();
    }

    function randomMode(exclude) {
        const choices = names.filter(n => n !== exclude);
        return choices[Math.floor(Math.random() * choices.length)];
    }

    const pinned = params.get('mode');
    if (names.includes(pinned)) {
        setMode(pinned);
        return;
    }

    const interval = (Number(params.get('interval')) || SWITCH_SECONDS) * 1000;
    setMode(randomMode(null));
    setInterval(() => setMode(randomMode(current)), interval);
})();

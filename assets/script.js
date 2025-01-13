document.addEventListener("DOMContentLoaded", function() {
    const loader = document.getElementById('loader');

    function toggleLoader() {
        const isVisible = loader.style.display === 'block';
        loader.style.display = isVisible ? 'none' : 'block';
    }

    function randomToggleLoader() {
        toggleLoader();
        const randomInterval = Math.random() * 5000 + 1000; // Random interval between 1 and 6 seconds
        setTimeout(randomToggleLoader, randomInterval);
    }

    randomToggleLoader();
});


// Random cursor movement
const cursor = document.getElementById('cursor');
function moveCursor() {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
}
setInterval(moveCursor, 1000);
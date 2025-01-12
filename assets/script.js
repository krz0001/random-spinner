document.addEventListener('click', function() {
    const loader = document.getElementById('loader');
    loader.style.display = 'block';

    const randomTime = Math.floor(Math.random() * 5000) + 1000; // Random time between 1 and 6 seconds

    setTimeout(function() {
        loader.style.display = 'none';
    }, randomTime);
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
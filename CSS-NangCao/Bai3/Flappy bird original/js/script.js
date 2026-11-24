$(function () {

    // ---- Hình ảnh cá nhân hóa: chim và ống khói tự vẽ bằng SVG ----
    // Muốn dùng ảnh riêng, thay bằng: 'url("sprites/bird.png")' và 'url("sprites/chimney.png")'
    function svgUri(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }

    var BIRD_IMG = svgUri(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 65 42'>" +
        "<path d='M10 18 L1 12 L4 22 L0 30 L12 27Z' fill='#e8553a' stroke='#6b2616' stroke-width='1.5' stroke-linejoin='round'/>" +
        "<ellipse cx='32' cy='22' rx='24' ry='18' fill='#ff7a59' stroke='#6b2616' stroke-width='2'/>" +
        "<ellipse cx='34' cy='30' rx='15' ry='8' fill='#ffe2b8'/>" +
        "<path d='M16 20 Q26 6 40 20 Q28 32 16 20Z' fill='#ffa07a' stroke='#6b2616' stroke-width='1.5'/>" +
        "<path d='M34 6 Q36 1 40 5' fill='none' stroke='#6b2616' stroke-width='2' stroke-linecap='round'/>" +
        "<circle cx='46' cy='14' r='7' fill='#fff' stroke='#6b2616' stroke-width='1.5'/>" +
        "<circle cx='48' cy='14' r='3.2' fill='#1b1b1b'/>" +
        "<path d='M54 18 L64 22 L54 28Z' fill='#ffc400' stroke='#6b2616' stroke-width='1.5' stroke-linejoin='round'/>" +
        "</svg>");

    var CHIMNEY_IMG = svgUri(
        "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='20'>" +
        "<rect width='30' height='20' fill='#c0563d'/>" +
        "<path d='M0 0H30M0 10H30M0 20H30M15 0V10M0 10V20M30 10V20' stroke='#8a3a28' stroke-width='2' fill='none'/>" +
        "</svg>");

    // ---- Khai báo các object ----
    var container = $('#container');
    var bird      = $('#bird');
    var pole      = $('.pole');
    var pole_1    = $('#pole_1');
    var pole_2    = $('#pole_2');
    var score     = $('#score');
    var levelBox  = $('#level');

    bird.css('background-image', BIRD_IMG);
    pole.css('background-image', CHIMNEY_IMG);

    // ---- Chuyển các thông tin của object sang dạng số ----
    var container_width       = parseInt(container.width());
    var container_height      = parseInt(container.height());
    var pole_initial_position = parseInt(pole.css('right'));
    var pole_initial_height   = parseInt(pole.css('height'));
    var bird_left             = parseInt(bird.css('left'));
    var bird_height           = parseInt(bird.height());
    var speed                 = 10; // Tốc độ di chuyển ống khói

    // ---- Cấu hình Level ----
    var LEVEL_INTERVAL = { 1: 40, 2: 30, 3: 25, 4: 20 }; // Interval (ms) của từng Level
    var WIN_SCORE = 50;                                  // Đạt 50 điểm thì thắng

    // ---- Các trạng thái trong game ----
    var level = 1;
    var the_game = null;     // Id của setInterval chạy game
    var go_up = false;       // Đang giữ phím Arrow Down
    var score_updated = false;
    var game_over = false;
    var started = false;

    // Tính Level theo điểm
    function getLevel(s) {
        if (s >= 40) return 4;
        if (s >= 20) return 3;
        if (s >= 5)  return 2;
        return 1;
    }

    // (Re)start vòng lặp game theo Interval của Level hiện tại
    function startLoop() {
        clearInterval(the_game);
        the_game = setInterval(tick, LEVEL_INTERVAL[level]);
    }

    // Hàm bắt đầu game
    function playGame() {
        started = true;
        startLoop();
    }

    // Mỗi nhịp của game
    function tick() {
        var bird_top = parseInt(bird.css('top'));

        if (collision(bird, pole_1, 5) ||        // Chim va chạm ống trên
            collision(bird, pole_2, 5) ||        // Hoặc va chạm ống dưới
            bird_top <= 0 ||                     // Hoặc chạm biên trên
            bird_top > container_height - bird_height) // Hoặc chạm biên dưới
        {
            stop_the_game();
            return;
        }

        var pole_current_position = parseInt(pole.css('right'));

        // Cộng điểm khi chim vượt qua 1 cặp ống
        if (pole_current_position > container_width - bird_left && score_updated === false) {
            score_updated = true;
            addScore();
            if (game_over) return; // Vừa thắng game
        }

        // Ống đã ra khỏi khung game: tạo chiều cao ngẫu nhiên và đưa về vị trí ban đầu
        if (pole_current_position > container_width) {
            var new_height = parseInt(Math.random() * 100);
            pole_1.css('height', pole_initial_height + new_height);
            pole_2.css('height', pole_initial_height - new_height);
            score_updated = false;
            pole_current_position = pole_initial_position;
        }

        // Di chuyển ống khói
        pole.css('right', pole_current_position + speed);

        // Giữ phím thì bay lên, thả phím thì rơi xuống
        if (go_up) { up(); } else { go_down(); }
    }

    // Cộng điểm, đổi Level hoặc thắng game
    function addScore() {
        var s = parseInt(score.text()) + 1;
        score.text(s);

        if (s >= WIN_SCORE) {
            win_the_game();
            return;
        }

        var new_level = getLevel(s);
        if (new_level !== level) {
            level = new_level;
            levelBox.text('Level ' + level);
            startLoop(); // Chạy lại vòng lặp với Interval mới
        }
    }

    // ---- Điều khiển bằng bàn phím: Arrow Down thay cho mousedown/mouseup ----
    $(document).on('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.keyCode === 40) {
            e.preventDefault(); // Không cho trang bị cuộn xuống
            if (started && !game_over) go_up = true;
        }
    });

    $(document).on('keyup', function (e) {
        if (e.key === 'ArrowDown' || e.keyCode === 40) {
            go_up = false;
        }
    });

    // Khi nhấn vào Chơi game
    $('#play_btn').click(function () {
        playGame();
        $(this).hide();
    });

    // Hàm di chuyển chú chim rơi xuống
    function go_down() {
        bird.css('top', parseInt(bird.css('top')) + 10);
        bird.css('transform', 'rotate(50deg)');
    }

    // Hàm di chuyển chú chim bay lên
    function up() {
        bird.css('top', parseInt(bird.css('top')) - 20);
        bird.css('transform', 'rotate(-10deg)');
    }

    // Hàm thua game
    function stop_the_game() {
        clearInterval(the_game);
        game_over = true;
        go_up = false;
        $('#restart_btn').slideDown();
    }

    // Hàm thắng game
    function win_the_game() {
        clearInterval(the_game);
        game_over = true;
        go_up = false;
        $('#win').css('display', 'flex');
    }

    // Khi click vào nút Chơi lại
    $('#restart_btn, #win_btn').click(function () {
        location.reload();
    });

    // Hàm va chạm giữa 2 object (pad: thu nhỏ vùng va chạm của object 1 cho dễ chơi hơn)
    function collision($div1, $div2, pad) {
        pad = pad || 0;
        var p1 = $div1.position(), p2 = $div2.position();

        var x1 = p1.left + pad;
        var y1 = p1.top + pad;
        var r1 = p1.left + $div1.outerWidth(true) - pad;
        var b1 = p1.top + $div1.outerHeight(true) - pad;

        var x2 = p2.left;
        var y2 = p2.top;
        var r2 = x2 + $div2.outerWidth(true);
        var b2 = y2 + $div2.outerHeight(true);

        // Không va chạm
        if (b1 < y2 || y1 > b2 || r1 < x2 || x1 > r2) {
            return false;
        }
        return true;
    }
});

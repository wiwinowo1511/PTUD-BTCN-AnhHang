/* put your animation code here */


$(function () {

    $('figure img').on('mouseover', function (e) {

        // Lấy thông tin ảnh
        var alt = $(this).attr('alt');
        var src = $(this).attr('src');
        var newsrc = src.replace("small", "medium");

        // Tạo phần tử chứa ảnh lớn và chú thích
        var preview = $('<div id="preview"></div>');
        var image = $('<img src="' + newsrc + '">');
        var caption = $('<p>' + alt + '</p>');

        preview.append(image);
        preview.append(caption);
        $('body').append(preview);

        // Làm ảnh nhỏ chuyển sang màu xám
        $(this).addClass("gray");

        // Hiện ảnh xem trước
        $("#preview").fadeIn(1000);
    });

});


function removePreview() {

    // Xóa class gray khỏi ảnh nhỏ
    $(this).removeClass("gray");

    // Xóa phần tử preview
    $("#preview").remove();
}

function movePreview(e) {

    // Định vị preview theo tọa độ chuột
    $("#preview")
        .css("top", (e.pageY - 10) + "px")
        .css("left", (e.pageX + 30) + "px");
}

$("figure img").on("mouseleave", removePreview);
$("figure img").on("mousemove", movePreview);
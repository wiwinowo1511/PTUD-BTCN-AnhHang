
$(function() {

    // Ẩn hiệu ứng loading ban đầu
    $('.animLoading').hide();

    $("#consume").click(function() {

        // Hiển thị loading
        $('.animLoading').show();

        var url =
        "http://www.randyconnolly.com/funwebdev/services/travel/cities.php";

        $.get(url)

            // Xử lý khi thành công
            .done(function(data) {

                $.each(data, function(index, value) {

                    var li = $('<li/>').html(value.name);

                    li.appendTo("div#results ul");

                });

            })

            // Xử lý khi xảy ra lỗi
            .fail(function(xhr, status, error) {

                alert("failed loading data - status=" + status +
                      " error=" + error);

            })

            // Luôn thực hiện khi yêu cầu kết thúc
            .always(function(data) {

                $('.animLoading').fadeOut("slow");

            });

    });

});

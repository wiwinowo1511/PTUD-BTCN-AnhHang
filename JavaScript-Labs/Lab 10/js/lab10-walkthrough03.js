/* try the different advanced selection calls here */

// $(':password').css('background-color', 'yellow');

// chọn phần tử con thứ 4, 8, ... của form
$('form :nth-child(4n)').css('background-color', 'yellow');

// chọn <label> có chứa chữ "word", đổi màu chữ
$('label:contains("word")').css("color", "black");


/* try the different selection calls here */


var msg = $('#msgArea');
msg.val("here is some new text");

//  attr() 
$('#msgArea').val("My class is " + $('#msgArea').attr("class"));

// dùng html() 
$('#first').html("new Title");

// chọn theo tên thẻ và đổi màu nền
var buttons = $('button');
buttons.css('background-color', 'red');

//  đổi màu nền body
var temp = $('body');
temp.css("background-color", "ivory");

// thêm class "selected" 
$('.center-icons').addClass('selected');

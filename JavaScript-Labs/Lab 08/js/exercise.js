
function outputList(items, activeItem) {
    var html = "";

    for (var i = 0; i < items.length; i++) {
        if (items[i] == activeItem) {
            html += "<li class='list-group-item active'>";
            html += items[i];
            html += "</li>";
        } else {
            html += "<li class='list-group-item'>";
            html += "<a href='#'>" + items[i] + "</a>";
            html += "</li>";
        }
    }

    return html;
}


// Hiển thị danh sách Continents
function outputContinents() {
    var html = "<ul class='list-group'>";
    html += outputList(continents);
    html += "</ul>";

    return html;
}


// Hiển thị danh sách Popular Countries
function outputCountries() {
    var html = "<ul class='list-group'>";
    html += outputList(countries, "Canada");
    html += "</ul>";

    return html;
}


// Hiển thị một bài viết
function outputPost(post) {
    var html = "";

    html += "<div class='row'>";
    html += "<div class='col-md-2'>";
    html += "<a href='post.php?id=" + post.id + "'>";
    html += "<img src='images/travel/" + post.thumb + "' ";
    html += "alt='" + post.title + "' class='img-thumbnail'/>";
    html += "</a>";
    html += "</div>";

    html += "<div class='col-md-10'>";
    html += "<h2>" + post.title + "</h2>";

    html += "<div class='details'>";
    html += "Posted by " + post.user;
    html += "<span class='pull-right'>" + post.postdate + "</span>";
    html += "</div>";

    html += "<p class='excerpt'>" + post.excerpt + "</p>";

    html += "<p><a href='post.php?id=" + post.id + "' ";
    html += "class='btn btn-primary btn-sm'>Read more</a></p>";

    html += "</div>";
    html += "</div>";
    html += "<hr/>";

    return html;
}


// Hiển thị danh sách Posts
function outputPosts() {
    var html = "";

    for (var i = 0; i < posts.length; i++) {
        html += outputPost(posts[i]);
    }

    return html;
}


// Hiển thị Pagination
function outputPagination(currentPage, totalPages) {
    var html = "<ul class='pagination'>";

    html += "<li><a href='#'>&laquo;</a></li>";

    for (var i = 1; i <= totalPages; i++) {
        if (i == currentPage) {
            html += "<li class='active'><a href='#'>" + i + "</a></li>";
        } else {
            html += "<li><a href='#'>" + i + "</a></li>";
        }
    }

    html += "<li><a href='#'>&raquo;</a></li>";
    html += "</ul>";

    return html;
}

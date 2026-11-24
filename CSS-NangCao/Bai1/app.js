/* ===== Dữ liệu cửa hàng: vòng tay đá thạch anh ===== */
var CATS = ["Thạch anh tím", "Thạch anh hồng", "Thạch anh trắng", "Thạch anh lựu đỏ", "Thạch anh khói", "Thạch anh vàng (Citrine)"];
var P = [
  { id: 1, cat: 0, name: "Vòng tay thạch anh tím 8mm", price: 490000, c: "#8e5bb5", image: "images/thạch anh tím.webp", s: 5, r: 15, stock: 80, sale: 15, label: "Best Seller", d: "Amethyst tím nhạt, giúp tĩnh tâm và ngủ ngon theo quan niệm phong thủy." },
  { id: 2, cat: 0, name: "Vòng tay thạch anh tím 10mm", price: 690000, c: "#7a4aa3", image: "images/thạch anh tím.webp", s: 4, r: 9, stock: 15, sale: 10, label: "New", d: "Hạt 10mm tròn đều, màu tím đậm, hợp cổ tay nam." },
  { id: 3, cat: 1, name: "Vòng tay thạch anh hồng 8mm", price: 450000, c: "#f2a7c3", image: "images/thạch anh hồng.webp", s: 5, r: 21, stock: 35, sale: 20, label: "Best Seller", d: "Rose Quartz biểu tượng của tình yêu và sự dịu dàng." },
  { id: 4, cat: 2, name: "Vòng tay thạch anh trắng 8mm", price: 390000, c: "#dfe9ee", image: "images/moonstone.webp", s: 4, r: 12, stock: 5, sale: 5, label: "New", d: "Thạch anh trắng trong suốt, dễ phối đồ, phù hợp mọi lứa tuổi." },
  { id: 5, cat: 3, name: "Vòng tay thạch anh lựu đỏ 10mm", price: 890000, c: "#a9263f", image: "images/thạch anh lựu đỏ.webp", s: 5, r: 18, stock: 65, sale: 12, label: "Best Seller", d: "Thạch anh lựu đỏ màu sắc rực rỡ, mang vẻ sang trọng và nổi bật." },
  { id: 6, cat: 4, name: "Vòng tay thạch anh khói 8mm", price: 420000, c: "#7a6a5f", image: "images/thạch anh khói.webp", s: 4, r: 6, stock: 0, label: "New", d: "Smoky Quartz màu nâu khói, trầm ổn, phong cách nam tính." },
  { id: 7, cat: 5, name: "Vòng tay thạch anh vàng Citrine 8mm", price: 590000, c: "#f0c040", image: "images/thạch anh vàng.webp", s: 4, r: 11, stock: 28, sale: 8, label: "New", d: "Citrine vàng óng, tượng trưng cho sự thịnh vượng." },
  { id: 8, cat: 1, name: "Vòng tay thạch anh hồng 10mm", price: 650000, c: "#ee8fb2", image: "images/thạch anh hồng.webp", s: 5, r: 8, stock: 52, sale: 18, label: "Best Seller", d: "Hạt lớn 10mm, màu hồng đậm, làm quà tặng rất hợp." }
];

/* ===== Hàm tiện ích ===== */
function money(n) { return n.toLocaleString("vi-VN") + "đ"; }
function param(k) { return new URLSearchParams(location.search).get(k); }
function esc(s) { return $("<div>").text(s).html(); }
function stars(n) {
  return '<input type="text" class="rating" value="' + n + '" aria-label="Đánh giá ' + n + ' trên 5 sao">';
}
function initRatings(container) {
  $(container).find(".rating").rating({
    theme: "krajee-svg",
    displayOnly: true,
    showClear: false,
    showCaption: false,
    size: "xs"
  });
}
function stockStatus(stock) {
  if (stock <= 0) return { status: "Hết hàng", cls: "progress-bar-danger", text: "Hiện tại sản phẩm đã hết hàng" };
  if (stock <= 20) return { status: "Sắp hết hàng", cls: "progress-bar-danger", text: "Còn " + stock + " sản phẩm trong kho" };
  if (stock <= 40) return { status: "Số lượng còn ít", cls: "progress-bar-warning", text: "Còn " + stock + " sản phẩm trong kho" };
  return { status: "Còn nhiều hàng", cls: "progress-bar-success", text: "Còn " + stock + " sản phẩm trong kho" };
}
function stockHtml(p) {
  var state = stockStatus(p.stock);
  var percent = p.stock;
  return '<div class="product-stock"><p>Trạng thái kho: <strong class="' + (p.stock <= 20 ? "text-danger" : "") + '">' + state.status + '</strong></p>' +
    '<div class="progress"><div class="progress-bar ' + state.cls + '" role="progressbar" aria-valuenow="' + percent +
    '" aria-valuemin="0" aria-valuemax="100" style="width:' + percent + '%;">' + (percent ? percent + "%" : "") + '</div></div>' +
    '<p class="stock-text">' + state.text + '</p></div>';
}
function toast(t) {
  var e = $('<div class="alert alert-success toast-msg">' + t + '</div>').appendTo("body");
  setTimeout(function () { e.fadeOut(300, function () { e.remove(); }); }, 1800);
}
function galleryImages(p) {
  if (p.gallery && p.gallery.length) return p.gallery;
  return [{ thumb: p.image, preview: p.image, original: p.image, alt: p.name }];
}

/* ===== Giỏ hàng (lưu trong localStorage) ===== */
function cart() { try { return JSON.parse(localStorage.cart || "[]"); } catch (e) { return []; } }
function save(c) { localStorage.cart = JSON.stringify(c); badge(); }
function add(id, q, o) {
  var c = cart(), k = c.filter(function (x) { return x.id == id && x.o == (o || ""); })[0];
  if (k) k.q += q; else c.push({ id: id, q: q, o: o || "" });
  save(c);
}
function badge() { $(".cart-badge").text(cart().reduce(function (a, x) { return a + x.q; }, 0)); }
function quick(id) { add(id, 1, ""); toast("Đã thêm vào giỏ hàng"); return false; }
function showCart() {
  var c = cart(), t = 0, h = "";
  if (!c.length) h = "<p>Giỏ hàng đang trống.</p>";
  else {
    h = '<table class="table"><tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th><th></th></tr>';
    c.forEach(function (x, i) {
      var p = P[x.id - 1], s = p.price * x.q; t += s;
      h += '<tr><td>' + p.name + (x.o ? '<br><small>' + x.o + '</small>' : '') + '</td><td>' + x.q + '</td><td>' + money(s) +
        '</td><td><a href="#" onclick="return del(' + i + ')" class="glyphicon glyphicon-trash"></a></td></tr>';
    });
    h += '<tr><th colspan="2">Tổng cộng</th><th colspan="2">' + money(t) + '</th></tr></table>';
  }
  $("#cartBody").html(h);
  $("#cartModal").modal("show");
}
function del(i) { var c = cart(); c.splice(i, 1); save(c); showCart(); return false; }
function checkout() {
  if (!cart().length) return;
  save([]); $("#cartModal").modal("hide");
  toast("Đặt hàng thành công! Shop sẽ liên hệ xác nhận.");
}
function logout() { localStorage.removeItem("user"); location.reload(); return false; }

/* ===== Card sản phẩm  ===== */
function card(p) {
  var u = 'ecommerce-detail.html?id=' + p.id;
  var saleBadge = p.sale ? '<span class="product-sale-badge">-' + p.sale + '%</span>' : '';
  var statusBadge = p.label ? '<span class="product-status-badge ' + (p.label === "New" ? "new" : "best-seller") + '">' + p.label + '</span>' : '';
  return '<div class="col-sm-6 col-md-4"><div class="thumbnail"><div class="product-card-media"><a href="' + u + '"><img class="product-card-image img-responsive" src="' + p.image + '" alt="' + p.name + '"></a>' +
    saleBadge + statusBadge + '</div>' +
    '<div class="caption"><h4 class="pull-right">' + money(p.price) + '</h4><h4><a href="' + u + '">' + p.name + '</a></h4><p>' + p.d + '</p>' +
    stockHtml(p) +
    '<div class="ratings"><p class="pull-right"><a href="' + u + '#comments">' + p.r + ' đánh giá</a></p><p>' + stars(p.s) + '</p></div>' +
    '<div class="product-card-actions"><a class="btn btn-default" href="' + u + '">Xem</a>' +
    '<button type="button" class="btn btn-success" onclick="quick(' + p.id + ')"><span class="glyphicon glyphicon-shopping-cart"></span> Thêm vào giỏ</button></div></div></div></div>';
}

/* ===== Thanh bên ===== */
function sideCats(active) {
  var h = '<h3>Danh mục</h3><ul class="list-group"><li class="list-group-item' + (active === null ? ' active' : '') + '"><span class="badge">' + P.length + '</span><a href="ecommerce.html">Tất cả sản phẩm</a></li>';
  CATS.forEach(function (c, i) {
    var n = P.filter(function (p) { return p.cat == i; }).length;
    h += '<li class="list-group-item' + (active == i ? ' active' : '') + '"><span class="badge">' + n + '</span><a href="ecommerce.html?cat=' + i + '">' + c + '</a></li>';
  });
  return h + '</ul>';
}
function sideOrders() {
  return '<h3>Quản lý đơn hàng</h3><ul class="list-group"><li class="list-group-item"><a href="ecommerce-status.html">Tất cả đơn hàng</a></li>' +
    '<li class="list-group-item"><a href="#">Quản lý phản hồi</a></li><li class="list-group-item"><a href="#">Mã giảm giá</a></li>' +
    '<li class="list-group-item"><a href="#">Địa chỉ giao hàng</a></li></ul>';
}

/* ===== Navbar + modal + footer ===== */
function layout(side) {
  var u = localStorage.user || "";
  var acc = u ? '<li><a href="#" onclick="return logout()">' + esc(u.split("@")[0]) + ' (Thoát)</a></li>'
    : '<li><a href="#" data-toggle="modal" data-target="#myModal">Đăng nhập</a></li>';
  var dd = CATS.map(function (c, i) { return '<li><a href="ecommerce.html?cat=' + i + '">' + c + '</a></li>'; }).join("");
  var nav = '<nav class="navbar navbar-default"><div class="container-fluid"><div class="navbar-header">' +
    '<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#nav-collapse" aria-expanded="false"><span class="sr-only">Toggle navigation</span><span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span></button>' +
    '<a class="navbar-brand" href="ecommerce.html"><span class="glyphicon glyphicon-leaf"></span> Thạch Anh Xinh</a>' +
    '<form class="sform visible-xs-inline-block" style="margin-top:10px"><div class="form-group"><input type="text" class="form-control" placeholder="Tìm vòng tay..."></div></form></div>' +
    '<div class="collapse navbar-collapse" id="nav-collapse"><ul class="nav navbar-nav"><li><a href="ecommerce.html">Trang chủ</a></li>' +
    '<li class="dropdown"><a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Danh mục <span class="caret"></span></a><ul class="dropdown-menu">' + dd + '</ul></li>' +
    '<li><a href="ecommerce-status.html">Đơn hàng</a></li></ul>' +
    '<form class="sform navbar-form navbar-left hidden-xs"><div class="form-group"><input type="text" class="form-control" placeholder="Tìm vòng tay..."></div> <button type="submit" class="btn btn-default">Tìm</button></form>' +
    '<ul class="nav navbar-nav navbar-right"><li><a href="#" onclick="showCart();return false"><span class="badge pull-right cart-badge">0</span><i class="glyphicon glyphicon-shopping-cart"></i></a></li>' +
    '<li><a href="ecommerce-status.html"><i class="glyphicon glyphicon-user"></i></a></li>' + acc + '</ul></div></div></nav>';

  var modals = '<div class="modal fade" id="myModal" tabindex="-1" role="dialog"><div class="modal-dialog modal-sm" role="document"><div class="modal-content"><form id="loginForm">' +
    '<div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button><h4 class="modal-title">Đăng nhập</h4></div>' +
    '<div class="modal-body"><div class="form-group"><label>Email</label><input type="email" id="lemail" class="form-control" required></div>' +
    '<div class="form-group"><label>Mật khẩu</label><input type="password" class="form-control" required></div></div>' +
    '<div class="modal-footer"><button type="submit" class="btn btn-success">Đăng nhập</button></div></form></div></div></div>' +
    '<div class="modal fade" id="cartModal" tabindex="-1" role="dialog"><div class="modal-dialog" role="document"><div class="modal-content">' +
    '<div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button><h4 class="modal-title">Giỏ hàng của bạn</h4></div>' +
    '<div class="modal-body" id="cartBody"></div><div class="modal-footer"><button class="btn btn-default" data-dismiss="modal">Tiếp tục mua</button> ' +
    '<button class="btn btn-success" onclick="checkout()">Đặt hàng</button></div></div></div></div>';

  $("#nav").html(nav + modals);
  $("#side").html(side);
  $("#foot").html('<div class="container"><hr><p class="text-center text-muted">&copy; 2026 Thạch Anh Xinh - Vòng tay đá thạch anh tự nhiên | Hotline: 0900 000 000</p></div>');
  $(".sform").on("submit", function (e) {
    e.preventDefault();
    location.href = "ecommerce.html?q=" + encodeURIComponent($(this).find("input").val());
  });
  $("#loginForm").on("submit", function (e) {
    e.preventDefault(); localStorage.user = $("#lemail").val(); location.reload();
  });
  badge();
}

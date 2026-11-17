/* code goes here */
var isCanadian = true;

// function taxRate() {
//     // remember : variables defined outside of a function have global scope
//     if (isCanadian) {
//         return 0.05;
//     } else {
//         return 0.0;
//     }
// }

// function calculateTax(amount) {
//     return amount * taxRate();
// }


//  di chuyển hàm taxRate() vào bên trong hàm calculateTax() 
function calculateTax(amount) {
    // function taxRate() {
    //     if (isCanadian) {
    //         return 0.05;
    //     } else {
    //         return 0.0;
    //     }
    // }
    //   var tax = function taxRate() 

    // Tạo hàm ẩn danh 
    var tax = function () {
        if (isCanadian) {
            return 0.05;
        } else {
            return 0.0;
        }
    };

    return amount * tax();
}

// Thay đổi hàm calculateTax() để nhận một hàm callback làm đối số

function calculateTax(amount, tax) {
    return amount * tax();
}

function calculateTotal(price, quantity) {
    var amount = price * quantity;

    return amount + calculateTax(amount, function () {
        if (isCanadian) {
            return 0.05;
        } else {
            return 0.0;
        }
    });
}

// function calculateTotal(price, quantity) {
//     return (price * quantity) + calculateTax(price * quantity);
// }
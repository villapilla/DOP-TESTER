var testData = [],
      test = document.getElementsByClassName("numberTests"),
      pass = document.getElementsByClassName("testPass");
    testData.forEach.call(test, function (element, index, array) {
      testData.push({y: (array.length - index), a: element.textContent, b: pass[index].textContent});
    });
    alert(testData);
    new Morris.Line({
      element: 'morris-area-chart',
      data: testData.reverse(),
      xkey: 'y',
      ykeys: ['a', 'b'],
      labels: ['Test Pasados', 'Test Fallados'],
      lineColors: ["green" , "red"],
      parseTime: false
    });
    document.getElementById("dropdownMenuDetails").addEventListener("click", function() {
      var menu = $("#details");
      if(this.text === "- Detalles") {
        this.text = "+ Detalles";
        menu.addClass("noDisplay");
      } else {
        this.text = "- Detalles";
        menu.removeClass("noDisplay");
      }
    }, false);
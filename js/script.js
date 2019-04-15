require([
  "esri/views/SceneView",
  "esri/Map",
  "esri/tasks/IdentifyTask",
  "esri/tasks/support/IdentifyParameters",
  "esri/layers/IntegratedMeshLayer",
  "esri/widgets/Home"
  ], function(
    SceneView, Map, IdentifyTask, IdentifyParameters, IntegratedMeshLayer, Home
  ) {
    var map, view, almatyLayer, identifyTask, home;
    var gisBasemapUrl = "https://tiles.arcgis.com/tiles/zgQQNMEnmhCo9Kgi/arcgis/rest/services/Alga/SceneServer";
    var identifyUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer";

    // Вытаскиваем слой Базовая_карта_MIL1
    almatyLayer = new IntegratedMeshLayer({
      url: gisBasemapUrl,
      title: "Базовая карта Алматы"
    });

    // Создание карты Базовая_карта_MIL1
    map = new Map({
      layers: [almatyLayer],
      basemap: "hybrid",
      ground: "world-elevation"
    });

    // Создание SceneView
    view = new SceneView({
      container: "viewDiv",
      map: map
    });

    // home = new Home({
    //   view: view
    // });

    view.when(function(){
      document.getElementById('main_loading').style.display = 'none';

      view.goTo({
        center: [76.815584532, 43.2609192177],
        zoom: 18,
        tilt: 20
      })

      var cold_panel = document.getElementById('cold_panel');
      var heat_panel = document.getElementById('heat_panel');
      var cold_panel_back = document.getElementById('cold_panel_back');
      var heat_panel_back = document.getElementById('heat_panel_back');
      var goToButton = document.getElementById('goToButton');
      // view.ui.add(home, "top-right");
      view.ui.add(cold_panel, "top-left");
      view.ui.add(heat_panel, "top-left");
      view.ui.add(cold_panel_back, "top-right");
      view.ui.add(heat_panel_back, "top-right");
      view.ui.add(goToButton, "bottom-left");
      // При нажатии на карту
      view.on("click", executeIdentifyTask);


      goToButton.addEventListener('click',
      function() {
        view.goTo({
          center: [76.815584532, 43.2609192177],
          zoom: 18,
          tilt: 20
        });
        goToButton.style.display = 'none';
      })

      document.getElementById('close1').addEventListener('click',
      function(){
        cold_panel.style.display = 'none';
        cold_panel_back.style.display = 'block';
      })
      document.getElementById('close2').addEventListener('click',
      function(){
        heat_panel.style.display = 'none';
        heat_panel_back.style.display = 'block';
      })

      cold_panel_back.addEventListener('click',
      function(){
        cold_panel.style.display = 'block';
        cold_panel_back.style.display = 'none';
      })
      heat_panel_back.addEventListener('click',
      function(){
        heat_panel.style.display = 'block';
        heat_panel_back.style.display = 'none';
      })

    });

    // Перемещение карты
    view.on("drag", function(event) {

      switch (event.button) {
        case 0:
          if (view.center.latitude > 43.2655594114199 ||
              view.center.latitude < 43.25732192083989 ||
              view.center.longitude < 76.80819758830039 ||
              view.center.longitude > 76.82231256328794){

            goToButton.style.bottom = window.innerHeight/2+"px";
            goToButton.style.left = (window.innerWidth/2 - 160)+"px";
            goToButton.style.display = 'block';

          } else {
            goToButton.style.display = 'none';
          }
          break;
      }

    });

    // Скроллинг
    view.on("mouse-wheel", function(event) {
      // prevents zooming with the mouse-wheel event
      event.stopPropagation();
    });
    // Двойной-клик приближение
    view.on("double-click", function(event) {
      event.stopPropagation();
    });
    // create identify tasks and setup parameters
    identifyTask = new IdentifyTask(identifyUrl);

    params = new IdentifyParameters();
    params.tolerance = 4;
    params.returnGeometry = true;
    params.layerIds = [13];
    params.layerOption = "visible";
    params.width = view.width;
    params.height = view.height;

    function executeIdentifyTask(event) {
      cold_panel.style.display = 'none';
      heat_panel.style.display = 'none';
      cold_panel_back.style.display = 'none';
      heat_panel_back.style.display = 'none';
      table_cold.innerHTML = ""
      table_heat.innerHTML = ""
      // Set the geometry to the location of the view click
      params.geometry = event.mapPoint;
      params.mapExtent = view.extent;
      document.getElementById("viewDiv").style.cursor = "wait";

      // This function returns a promise that resolves to an array of features
      // A custom popupTemplate is set for each feature based on the layer it
      // originates from
      identifyTask.execute(params).then(function(response) {

        var results = response.results;

        return results.map(function(result) {

          var feature = result.feature;
          var layerName = result.layerName;

          feature.attributes.layerName = layerName;
          var cadastr_number = result.feature.attributes["Кадастровый номер"]

          backEnd(cadastr_number, feature);


          return feature;
        });

      }).then(showPopup); // Send the array of features to showPopup()

      // Shows the results of the Identify in a popup once the promise is resolved
      function showPopup(response){

        if (response.length > 0) {
          view.popup.open({
            features: response,
            location: event.mapPoint
          });
        }

        document.getElementById("viewDiv").style.cursor = "auto";

      }

      function backEnd(cad_num, fture){
        var xmlhttp = new XMLHttpRequest();
        var url = "http://counter.uaig.kz/api/getValueFromLog/" + cad_num;

        xmlhttp.onload = function() {
          if (this.readyState == 4 && this.status == 200) {
            var myArr = JSON.parse(this.responseText);
            myFunction(myArr);
          }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/json; charset=UTF-8");
        xmlhttp.send();
        function myFunction(arr) {
          if(!arr.length) {

            fture.popupTemplate = {
              title: "Информация по зданию",
              content: "Информация по данному зданию отсутствует"
            }

          }else {
            var dateHeat = [], valueHeat = [], dateCold = [], valueCold = [], i = 0, j = 0;

            arr.filter(function(item) {
              if (item.type_name == "Тепловой"){
                dateHeat[i] = item.check_date;
                valueHeat[i] = item.value;

                i++;
              } else if (item.type_name == "Холодная вода") {
                dateCold[j] = item.check_date;
                valueCold[j] = item.value;
                j++;
              }

            })

            fture.popupTemplate = {
              title: "Информация по зданию",
              content:
                "<div class='esri-feature__fields esri-feature__content-element'>"+
                  "<table class='esri-widget__table' summary='Список атрибутов и значений'>"+
                    "<tbody>"+
                      "<tr>"+
                        "<th class='esri-feature__field-header'>Кадастровый номер:</th>"+
                        "<td class='esri-feature__field-data'>"+arr[0].cadastral+"</td>"+
                      "</tr>"+
                      "<tr>"+
                        "<th class='esri-feature__field-header'>Район:</th>"+
                        "<td class='esri-feature__field-data'>"+arr[0].building_name+"</td>"+
                      "</tr>"+
                      "<tr>"+
                        "<th class='esri-feature__field-header'>Адрес:</th>"+
                        "<td class='esri-feature__field-data'>"+arr[0].building_name+"</td>"+
                      "</tr>"+
                      "<tr>"+
                        "<th class='esri-feature__field-header'>Техпаспорт:</th>"+
                        "<td class='esri-feature__field-data'>нет</td>"+
                      "</tr>"+
                      "<tr>"+
                        "<th class='esri-feature__field-header'>Счетчик(заводской номер):</th>"+
                        "<td class='esri-feature__field-data'>"+arr[0].serial+"</td>"+
                      "</tr>"+
                    "</tbody>"+
                  "</table>"+
                "</div>"
            } //template

            waterPanel(dateHeat, valueHeat, dateCold, valueCold);
          } //else

        } // myFunction

      } // backEnd

    } //executeIdentifyTask

    function waterPanel(dtC, vlC, dtH, vlH){
      cold_panel.style.display = 'inline-block';
      heat_panel.style.display = 'inline-block';

      if(vlC.length > 0){
        var newTr = document.createElement('tr')
        newTr.innerHTML = "<tr><th>Потребление</th><th>Дата</th></tr>"
        table_cold.appendChild(newTr);
        for (var i = 0; i < vlC.length; i++){
          var newTr = document.createElement('tr')
          newTr.innerHTML = "<th class='esri-feature__field-header'>" + vlC[i] + "</th>"+
          "<td class='esri-feature__field-data'>" + dtC[i] + "</td>"
          table_cold.appendChild(newTr);
        }

      } else {
        var newTr = document.createElement('div')
        newTr.innerHTML = "Информация по холодной воде отсутствует"
        table_cold.appendChild(newTr);
      }

      if (vlH.length > 0) {
        var newTr = document.createElement('tr')
        newTr.innerHTML = "<tr><th>Потребление</th><th>Дата</th></tr>"
        table_heat.appendChild(newTr);
        for (var i = 0; i < vlH.length; i++){
          var newTr = document.createElement('tr')
          newTr.innerHTML = "<th class='esri-feature__field-header'>" + vlH[i] + "</th>"+
          "<td class='esri-feature__field-data'>" + dtH[i] + "</td>"
          table_heat.appendChild(newTr);
        }

      } else {
        var newTr = document.createElement('div')
        newTr.innerHTML = "Информация по холодной воде отсутствует"
        table_heat.appendChild(newTr);
      }

    } // waterPanel

  } // require
);

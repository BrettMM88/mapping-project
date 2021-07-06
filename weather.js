function getURL(lat, lng) {
	// Darksky API Key
	var apikey = "";
	
	// Proxy URL to return CORS Headers
	var proxyURL = "https://polar-gorge-15245.herokuapp.com/";
	var apiURL = "https://api.darksky.net/forecast/" + apikey + "/";
	var requestURL = proxyURL + apiURL + lat + "," + lng;
	
	return requestURL;
}

function getWeatherURLS(routeMarkers) {
	weatherURLS = [];
	for (let y = 0; y < routeMarkers.length; y++){
		lat = routeMarkers[y].lat();
		lng = routeMarkers[y].lng();
		url = getURL(lat, lng);
		//console.log(url);
		weatherURLS[y] = url;
	}
	return weatherURLS;
}

function getRawWeather(weatherURLS, route) {
	return new Promise(function(resolve) {
		var weatherData = [];
		for (var url = 0; url < weatherURLS.length; url++) {
			makeAjaxCall(weatherURLS[url]).then(function(data){
				weatherData.push(data);
				//console.log(weatherData);
				if (weatherData.length == weatherURLS.length) {
					//console.log(weatherData);
					resolve({
						weatherData: weatherData,
						route: route
					});
				}
			});
		}
	});
	
	function makeAjaxCall(requestURL, url) {
		//console.log("Ajax fired");
		return $.ajax({
			type: 'GET',
			url: requestURL,
			contentType: "application/json; charset=utf-8",
            dataType: "json"
		});
	}
}

function attachWeather(weatherData, markerLocs, durations, map, route) {
	return new Promise(function(resolve) {
		//console.log(route);
		var routeMarkers = [];
		//console.log("ROUTE: " + route);
		//console.log(weather);
		//console.log(markerLocs);
		//console.log(durations);
		for (var x = 0; x < markerLocs.length; x++) {
			var weather = weatherData[x];
			var markerPosition = markerLocs[x];
			var duration = durations[x];
			var icon = weather.currently.icon;
			var timeTraveled = Math.round(duration / 3600);
			var hours = Math.floor(duration / 3600);
			var minutes = Math.round(duration / 60) - (hours * 60);
			var precipChance = 0;
			var precipType = "";
			//console.log(timeTraveled + " = " + hours + "hr " + minutes +"min");
			console.log(weather);
			if (timeTraveled === 0) {
					temp = weather.currently.temperature;
					description = weather.currently.summary;
					icon = weather.currently.icon;
					precipChance = Math.round((weather.currently.precipProbability) * 100) ;
					if (precipChance >= 10) {
						precipType = weather.currently.precipType;
					}
			} else if (timeTraveled != 0 && timeTraveled < 49) {
					//console.log(weather.hourly.data[timeTraveled].temperature);
					temp = weather.hourly.data[timeTraveled].temperature;
					//console.log(weather.hourly.data[timeTraveled].summary);
					description = weather.hourly.data[timeTraveled].summary;
					//console.log(weather.hourly.data[timeTraveled].icon);
					icon = weather.hourly.data[timeTraveled].icon;
					var precipChance = Math.round((weather.hourly.data[timeTraveled].precipProbability) * 100) ;
					if (precipChance >= 10) {
						var precipType = weather.hourly.data[timeTraveled].precipType;
					}
			} else if (timeTraveled > 48) {
					day = Math.floor(timeTraveled / 24);
					//console.log(weather.daily.data[day].apparentTemperatureHigh);
					temp = weather.daily.data[day].apparentTemperatureHigh;
					//console.log(weather.daily.data[day].summary);
					description = weather.daily.data[day].summary;
					//console.log(weather.daily.data[day].icon);
					icon = weather.daily.data[day].icon;
			}
			var travelInfo;
			if (hours < 1 && minutes > 0) { // only display minutes
				travelInfo = '<div id="travelTime">In '+  minutes + 'min</div></div>';
			} else if (hours >= 1 && minutes == 0) { // Only display hours 
				travelInfo = '<div id="travelTime">In '+  hours + 'hrs </div></div>';
			} else if (hours >= 1 && minutes > 0) { // Show hours & minutes
				travelInfo = '<div id="travelTime">In '+  hours + 'hr ' + minutes + 'min</div></div>';
			} else if (hours == 0 && minutes == 0) { // Show currently
				travelInfo = '<div id="travelTime">Currently</div>';
			}
			
			weatherInfo = '<div class="weatherBlock"><div id="temp">' + Math.round(temp) + '<span>&#176;</span>F</div>' + 
													'<div id="description">' + description + '</div>' + travelInfo;
			
			if (precipChance >= 10) {
				weatherInfo += '<hr><div id="precip">' + precipType + ' ' + precipChance + '%</div>' 
			}
			
			weatherInfo += '</div>';
													
			//console.log(weatherInfo);
			routeMarkers.push(addMarker(markerPosition, map, weatherInfo, icon, false));
		}
		resolve({
			routeMarkers: routeMarkers,
			route: route
		});
	});
}

function getWeatherIcon(icon) {
	var iconPath = "";
	switch(icon) {
		case "clear-day":
			iconPath = "icons/newicons/images/clear-day-50-pointed.png";
			break;
		case "clear-night":
			iconPath = "icons/newicons/images/clear-night-50-pointed.png";
			break;
		case "rain":
			iconPath = "icons/newicons/images/rain-50-pointed.png";
			break;
		case "snow":
			iconPath = "icons/newicons/images/snow-50-pointed.png";
			break;
		case "sleet":
			iconPath = "icons/newicons/images/sleet-50-pointed.png";
			break;
		case "wind":
			iconPath = "icons/newicons/images/wind-50-pointed.png";
			break;
		case "fog":
			iconPath = "icons/newicons/images/fog-50-pointed.png";
			break;
		case "cloudy":
			iconPath = "icons/newicons/images/cloudy-50-pointed.png";
			break;
		case "partly-cloudy-day":
			iconPath = "icons/newicons/images/partly-cloudy-day-50-pointed.png";
			break;
		case "partly-cloudy-night":
			iconPath = "icons/newicons/images/partly-cloudy-night-50-pointed.png";
			break;
		case "loading":
			iconPath = "icons/newicons/images/loading-50.gif";
			break;
		default:
			iconPath = "icons/newicons/images/clear-day-50-pointed.png";
			break;
	}
	return iconPath;
}
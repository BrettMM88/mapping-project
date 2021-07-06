"use strict";
// Global variables
var map;
var routeInfo = [];
var allPromises = [];
var allMarkers = [];
var tempMarkers = [];
var route_index = 0;
var marker_size = 50;

function loadMap() {
	// Initialize the handlers for the google maps api.
	var directionsService = new google.maps.DirectionsService();
	var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true}); // Initialize our Map
	
	map = new google.maps.Map(document.getElementById('map'), { // ID for map
		zoom: 7,
		maxZoom: 12,
		minZoom: 3,
		center: {
			lat: 38.812650, 
			lng: -97.608291
		}, // Eventually user GPS would be used here.
		mapTypeControl: false,
		mapTypeControlOptions: { // Move default controls around here.
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.TOP_CENTER
		},
		streetViewControl: false,
		scaleControl: false,
		fullscreenControl: false,
		zoomControl: true,
		zoomControlOptions: {
              position: google.maps.ControlPosition.TOP_RIGHT
        }
	});
	
	// Tell our directionsDisplay what map & panel to use for directions
	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById('directions-display')); // ID for directions-display
	
	// Event to know when a user selects a route.
	directionsDisplay.addListener('routeindex_changed', function () {
		route_index = this.getRouteIndex();
		showMarkers(map, this.getRouteIndex());
	}); 
	
	// Event to know when a user submits for directions
	var hasRun = false;
	document.getElementById('search').addEventListener('click', function () {
		//console.log("go clicked");
		if (hasRun == true) {
			//console.log("Need to clear our markers")
			clearElements(map);
		} else if (hasRun == false) {
			//console.log("hasRun = true")
			hasRun = true;
		}
		document.getElementById('search').innerHTML = "Loading";
		document.getElementById('search').disabled = true;
		requestRoute(directionsService, directionsDisplay, map);
	});
	
	document.getElementById('directionsBtn').addEventListener('click', function () {
		var curSize = document.getElementById('directions-display').offsetWidth;
		//console.log(curSize);
		if (curSize == 0) { // Expand directions panel
			document.getElementById('directions-display').style.width = "350px";
			document.getElementById('directionsBtn').innerHTML = "Hide";
			document.getElementById('directionsBtn').style.left = "350px";
		} else { // Hide directions panel.
			document.getElementById('directions-display').style.width = "0px";
			document.getElementById('directionsBtn').innerHTML = "Show Directions";
			document.getElementById('directionsBtn').style.left = "0px";
		}
	});
	
	// Event to know when the zoom level is changed
	google.maps.event.addListener(map, 'zoom_changed', function() {
		//console.log(map.getZoom());
		if (routeInfo.length) { // Check to make sure routeInfo isn't null first. 
			if (routeInfo[0].routeMarkerObjects) {
				//console.log("Check zoom and marker size");
				checkMarkerSize(map.getZoom(), routeInfo);
			}
		}
	});
}


// This function checks the marker size vs the zoom distance to enhance visibility at far zooms.
function checkMarkerSize(zoom_level, routeInfo) {
	// Check the zoom_level
	// Using a case statement incase we ever want to add more zoom level checks.
	switch(true) {
		case (zoom_level > 6):
			if (marker_size != 50) {
				//console.log("change to size 50");
				for (var mark = 0; mark < allMarkers.length; mark++) {
					var curIcon = allMarkers[mark].getIcon();
					//console.log(curIcon);
					allMarkers[mark].setIcon(curIcon.replace(/25/i,"50"));
				}
				marker_size = 50;
			}
			break;
		case (zoom_level <= 6):
			if (marker_size != 25) {
				//console.log("change to size 25");
				for (var mark = 0; mark < allMarkers.length; mark++) {
					var curIcon = allMarkers[mark].getIcon();
					//console.log(curIcon);
					allMarkers[mark].setIcon(curIcon.replace(/50/i,"25"));
				}
				marker_size = 25;
			}
			break;
		default:
			console.log("default");
			break;
	}
}

// This function requests the route, and also calls all the other functions required to display the map with the correct details.
function requestRoute(directionsService, directionsDisplay) {
	directionsService.route({
		origin: document.getElementById('start').value,
		destination: document.getElementById('end').value,
		travelMode: 'DRIVING', 
		provideRouteAlternatives: true
	}, function(response, status) {
		if (status === 'OK') {
			directionsDisplay.setDirections(response);
			//console.log(response);
			var routesReturned = response.routes;
			
			// Initialize routeInfo
			for (var x = 0; x < routesReturned.length; x++) {
				routeInfo[x] = ({
					routeCoords: [],
					routeMarkerLocations: null,
					routeWeatherData: null,
					routeDurationFromLast: [],
					routeMarkerObjects: null
				});
			}
			
			// Get route coordinates first
			for (var x = 0; x < routesReturned.length; x++){
				let routeCoords = [];
				routeCoords.push(routesReturned[x].legs[0].start_location);
				//console.log(routesReturned[x].overview_path);
				for (var y = 0; y < routesReturned[x].overview_path.length; y++) {
					routeCoords.push(routesReturned[x].overview_path[y]);
				}
				//routeInfo[x].routeCoords = routesReturned[x].overview_path;
				routeCoords.push(routesReturned[x].legs[0].end_location);
				//console.log(routeCoords);
				routeInfo[x].routeCoords = routeCoords;
			}
			
			// Get marker locations second
			var totalMarkers = 0;
			for (var x = 0; x < routeInfo.length; x++) {
				routeInfo[x].routeMarkerLocations = getMarkerCoords(routeInfo[x].routeCoords);
				totalMarkers += routeInfo[x].routeMarkerLocations.length;
				//console.log("Lat: " + routeInfo[x].routeMarkerCoords[6].lat() + " Lng: " + routeInfo[x].routeMarkerCoords[6].lng());
			}
			//console.log(routeInfo);
			//console.log("Total Markers = " + totalMarkers);
			
			// Check if we want to display temporary markers third
			if (totalMarkers > 25) {
				tempMarkers = [];
				//console.log("Show temporary markers!");
				for (var mark = 0; mark < routeInfo[0].routeMarkerLocations.length; mark++){
					//console.log(mark);
					if (mark % (Math.round(routeInfo[0].routeMarkerLocations.length * .2)) == 0) {
						var markerPosition = routeInfo[0].routeMarkerLocations[mark];
						var weatherInfo = "Loading...";
						var icon = "loading";
						tempMarkers.push(addMarker(markerPosition, map, weatherInfo, icon));
					} else if (mark == routeInfo[0].routeMarkerLocations.length - 1) {
						var markerPosition = routeInfo[0].routeMarkerLocations[mark];
						var weatherInfo = "Loading...";
						var icon = "loading";
						tempMarkers.push(addMarker(markerPosition, map, weatherInfo, icon));
					}
				}
			}
			
			// Get travel time between each marker fourth
			var travelTimePromises = [];
			for (var route = 0; route < routeInfo.length; route++) { // Loop for routeInfo
				//console.log(routeInfo);
				var origin = routeInfo[route].routeMarkerLocations[0];
				//console.log("Lat: " + origin.lat() + "Lng: " + origin.lng());
				for (var coord = 0; coord < routeInfo[route].routeMarkerLocations.length; coord++){
					var markerPosition = routeInfo[route].routeMarkerLocations[coord];
					routeInfo[route].routeDurationFromLast[coord] = 0;
					//console.log(markerPosition);
					travelTimePromises.push(getRouteDuration(origin, markerPosition, route, coord).then(function(response) {
							//console.log(response.route + " to " + response.coord + ": " + response.duration);
							routeInfo[response.route].routeDurationFromLast[response.coord] = response.duration;
						})
					);
				}
			}
			
			// Push this to allPromises
			allPromises.push(
				// Wait for all our route durations to come back.
				Promise.all(travelTimePromises).then(function() {
					console.log("Travel time promises finished.")
				})
			);
			
			
			var weatherPromises = [];
			for (var route = 0; route < routeInfo.length; route++) {
				var weather = new Promise(function(resolve) {
					var weatherURLS = getWeatherURLS(routeInfo[route].routeMarkerLocations);
					getRawWeather(weatherURLS, route).then(function(response) {
						routeInfo[response.route].routeWeatherData = response.weatherData;
						resolve();
					});
				});
				weatherPromises.push(weather);
			}
			//console.log("Weather Promises: " + weatherPromises);
			
			allPromises.push(
				Promise.all(weatherPromises).then(function() {
					console.log("Weather promises finished.")
				})
			);
			
			
			// Now we need to wait for all our promises to finish
			Promise.all(allPromises).then(function() {
				console.log("All promises have finished.")
				//document.getElementById('directions-display').style.visibility = "visible";
				// Now let's create and show our markers
				var markerPromises = [];
				for (var route = 0; route < routeInfo.length; route++) {
					var weather = routeInfo[route].routeWeatherData;
					var markerLocs = routeInfo[route].routeMarkerLocations;
					var durations = routeInfo[route].routeDurationFromLast;
					markerPromises.push(attachWeather(weather, markerLocs, durations, map, route).then(function(response) {
							routeInfo[response.route].routeMarkerObjects = response.routeMarkers;
							for (var mark = 0; mark < response.routeMarkers.length; mark++) {
								allMarkers.push(response.routeMarkers[mark]);
							}
						})
					);
				}
				Promise.all(markerPromises).then(function() {
					checkMarkerSize(map.getZoom(), routeInfo); // Call this in case user has changed zoom during execution
					showMarkers();
					document.getElementById('search').innerHTML = "Search";
					document.getElementById('search').disabled = false;
				});
			});	
		} else {
			window.alert('Directions request failed due to ' + status);
		}
	});
}

// This function gets the coordinates for markers every 50 miles. 
function getMarkerCoords(routeCoords) {
	const mileDistInMeters = 1609;
	var markerSpacingMiles = 50;
	var markerSpacingMeters = markerSpacingMiles * mileDistInMeters;
	var markerCoordArray = [];
	
	// Loop through our coordinates, and create markers at every desired distance.
	var i = 0;
	var x = 0;
	var distBetweenCoords = 0;
	var distanceNeeded = 0;
	var miles = 0; 
	
	while (i < routeCoords.length) {
		//console.log(i + " : " + (routeCoords.length - 1));
		if (i == 0) {
			markerCoordArray.push(routeCoords[i]);
		} else if (i == routeCoords.length - 1) { // If we are are the last coordinate, we dont want to go past this
			markerCoordArray.push(routeCoords[i]);
			break;
		}
		x = 0;
		// Get current lat, lng
		//console.log("got to next latlng");
		let curLatLng = routeCoords[i];
		let nextLatLng = routeCoords[i+1];
		
		// Distance until we want to place a marker.
		var distNeeded = markerSpacingMeters - distBetweenCoords;
		
		// Get the distance between our curLatLng and our nextLatLng
		var distBetweenCoords = distBetweenCoords + google.maps.geometry.spherical.computeDistanceBetween(curLatLng, nextLatLng);
		//console.log(distBetweenCoords);
		
		while (distBetweenCoords > markerSpacingMeters) {
			//console.log("Marker Placed!");
			var direction = google.maps.geometry.spherical.computeHeading(curLatLng, nextLatLng);
			var markerLatLng = google.maps.geometry.spherical.computeOffset(curLatLng, distNeeded + (x * markerSpacingMeters), direction);
			//console.log(markerLatLng.lat() + "," + markerLatLng.lng());
			markerCoordArray.push(markerLatLng);
			distBetweenCoords -= markerSpacingMeters;
			//console.log("Marker " + (x+1));
			x++;
		}
		i++;
	}
	return markerCoordArray;
}

// This variable tracks the number of requests we've made so we don't exceed our request cap. 
var reqMade = 0;

// This function gets the time between the origin point, and the current marker point. This is used to determine weather predictions.
function getRouteDuration(origin, markerPosition, route, coord) {
	return new Promise(function(resolve) {
		var start = [origin];
		//console.log(start);
		var destination = [markerPosition];
		//console.log(destination);
		if (reqMade < 100) {
			reqMade++;
			var service = new google.maps.DistanceMatrixService();
			service.getDistanceMatrix({
				origins: start,
				destinations: destination,
				travelMode: 'DRIVING',
			}, function(response, status) {
				//console.log(response);
				//console.log(status);
				if (response.rows[0].elements[0].status === "OK") {
					resolve({ 
						duration: response.rows[0].elements[0].duration.value,
						route: route,
						coord: coord
					});
				} else {
					resolve({
						duration: 0,
						route: route,
						coord: coord
					});
				}
			setTimeout(function() { reqMade--; }, 10000);
			});
		} else if (reqMade >= 100) {
			//console.log("At request cap, waiting.");
			setTimeout(function() { 
				resolve(getRouteDuration(origin, markerPosition, route, coord));
			}, 10005);
		}
	});
}

// This function creates markers based on the information from routeInfo.
function addMarker(position, map, weatherInfo, icon, visibility) {
	var marker;
	var iconPath = getWeatherIcon(icon);
	var infoWindow = new google.maps.InfoWindow({
		position: position,
		content: weatherInfo,
		maxWidth: 100
		//pixelOffset: new google.maps.Size(0, 50)
	});
	marker = new google.maps.Marker({
		position: position,
		map: map,
		icon: iconPath,
		visible: visibility
	});
	//infoWindow.open(map, marker);
	marker.addListener('click', function() {
		if (marker.getVisible() == true) {
			infoWindow.open(map, marker);
		} else if (marker.getVisible() == false) {
			infoWindow.close(map, marker);
		}
	});
	return marker;
}

// This function shows the proper markers depending on the route selected.
function showMarkers() {
	/*  This function is called anytime the routeIndex is changed, so we need to make sure our
		routeInfo array actually has data to display before allowing it to do anything. */
	if (!Array.isArray(routeInfo) || !routeInfo.length) {
		//console.log("routeInfo not ready");
	} else { // We have data in routeInfo so we can now process the markers.
		var markerSpacing = document.getElementById("mileage-selected").value;
		var increment = markerSpacing / 50;
		//console.log(increment);
		//console.log("show markers");
		if (tempMarkers.length) {
			//console.log("We need to clear temporary markers");
			for (var mark = 0; mark < tempMarkers.length; mark++) {
				tempMarkers[mark].setMap(null);
				tempMarkers[mark].setVisible(false);
			}
		}
		
		for (var x = 0; x < routeInfo.length; x++) {
			if (x == route_index) {
				//console.log(x);
				//console.log(routeInfo[x].routeMarkerObjects.length);
				for (var y = 0; y < routeInfo[x].routeMarkerObjects.length; y++) {
					let markerToPlace = routeInfo[x].routeMarkerObjects[y];
					//console.log(y);
					if (y % increment == 0) {
						//console.log(y + " show");
						markerToPlace.setVisible(true);
					} else if (y == 0 || y == routeInfo[x].routeMarkerObjects.length - 1) {
						//console.log(y + " show");
						markerToPlace.setVisible(true);
					} else {
						//console.log(y + " hide");
						markerToPlace.setVisible(false);
					}
				}
			} else {
				if (routeInfo[x].routeMarkerObjects != null) {
					for (var y = 0; y < routeInfo[x].routeMarkerObjects.length; y += increment) {
						let markerToPlace = routeInfo[x].routeMarkerObjects[y];					
						markerToPlace.setVisible(false);
					}
				}	
			}
		}
	}
}

// This function simply clears our everything we've added to routeMarkers, clears all the markers, etc. 
function clearElements(map) {
	//console.log(map);
	if (typeof allMarkers != 'undefined') {
		//console.log(allMarkers);
		for (var mark = 0; mark < allMarkers.length; mark++) {
			//if (allMarkers[mark].getMap = map) {
				//console.log(allMarkers[mark]);
				allMarkers[mark].setMap(null);
				allMarkers[mark].setVisible(false);
			//}
		}
		while (allMarkers.length) { allMarkers.pop(); }
		//console.log("Cleared allMarkers");
		//console.log(allMarkers);
		while (routeInfo.length) { routeInfo.pop(); }
		//console.log("Cleared routeInfo");
		//console.log(routeInfo);
	} else {
		// Do nothing.
	}
	/*if (!Array.isArray(allMarkers) || !allMarkers.length){
		
	}*/
}

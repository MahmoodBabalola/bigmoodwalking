const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();
let map;
let userMarker;
let startMarker;
let watchId;
let startLatLng;
let selectedMode = 'mylocation';
let hasStartedWalking = false;
let navigationSteps = [];

function initMap() {
  const defaultLocation = { lat: 51.505, lng: -0.09 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });
}

window.onload = initMap;

function handleLocationChoice() {
  const choice = document.getElementById("locationChoice").value;
  selectedMode = choice;

  if (choice === 'postcode') {
    openPostcodeModal();
  } else if (choice === 'pin') {
    alert("Click on the map to set your starting point.");
    map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      if (startMarker) {
        startMarker.setPosition(e.latLng);
      } else {
        startMarker = new google.maps.Marker({
          position: e.latLng,
          map: map,
          title: "Start Point",
        });
      }
      startLatLng = { lat, lng };
    });
  }
}

function openPostcodeModal() {
  document.getElementById("postcodeModal").style.display = "block";
}

function closePostcodeModal() {
  document.getElementById("postcodeModal").style.display = "none";
}

function submitPostcode() {
  const postcode = document.getElementById("postcode").value;
  if (!postcode) {
    alert("Please enter a postcode.");
    return;
  }
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: postcode }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const lat = results[0].geometry.location.lat();
      const lng = results[0].geometry.location.lng();
      startLatLng = { lat, lng };
      if (startMarker) {
        startMarker.setPosition(results[0].geometry.location);
      } else {
        startMarker = new google.maps.Marker({
          position: results[0].geometry.location,
          map: map,
          title: "Start Point",
        });
      }
      map.setCenter(results[0].geometry.location);
      closePostcodeModal();
    } else {
      alert("Could not find that postcode. Please try again.");
    }
  });
}

function getRoute() {
  const distance = document.getElementById("distance").value;
  const unit = document.getElementById("unitSelector").value;

  if (!distance || distance <= 0) {
    alert("Please enter a valid distance.");
    return;
  }

  if (selectedMode === 'mylocation') {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      startLatLng = { lat, lng };
      buildRoute(lat, lng, distance, unit);
    }, () => {
      alert("Could not get your location.");
    });
  } else if (selectedMode === 'postcode' || selectedMode === 'pin') {
    if (!startLatLng) {
      alert("Please set your starting point first.");
      return;
    }
    buildRoute(startLatLng.lat, startLatLng.lng, distance, unit);
  }
}

function buildRoute(lat, lng, distance, unit) {
  hasStartedWalking = false;
  directionsRenderer.setMap(null);
  directionsRenderer.setMap(map);

  let distanceInKm = parseFloat(distance);
  if (unit === 'miles') {
    distanceInKm *= 1.60934; // convert to km
  }

  const waypoints = [];
  const numPoints = 6;
  const radiusInKm = distanceInKm / (2 * Math.PI);

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusInKm * Math.cos(angle);
    const dy = radiusInKm * Math.sin(angle);
    const pointLat = lat + (dy / 111);
    const pointLng = lng + (dx / (111 * Math.cos(lat * Math.PI / 180)));
    waypoints.push({ location: { lat: pointLat, lng: pointLng }, stopover: true });
  }

  const request = {
    origin: { lat, lng },
    destination: { lat, lng },
    travelMode: 'WALKING',
    waypoints,
    optimizeWaypoints: false,
  };

  directionsService.route(request, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      document.getElementById("startNavigation").style.display = "inline-block";
      updateRouteInfo(result.routes[0].legs[0]);
      showNavigationSteps(result.routes[0].legs[0].steps);
    } else {
      alert("Could not generate route.");
    }
  });
}

function updateRouteInfo(leg) {
  document.getElementById("routeDistance").textContent = `Distance: ${leg.distance.text}`;
  document.getElementById("routeTime").textContent = `Estimated Time: ${leg.duration.text}`;
}

function showNavigationSteps(steps) {
  navigationSteps = steps;
  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.innerHTML = step.instructions;
    li.id = `step-${i}`;
    list.appendChild(li);
  });
}

// rest of the navigation logic remains unchanged...

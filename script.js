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

function handleLocationChoice(mode) {
  selectedMode = mode;
  if (mode === 'postcode') {
    openPostcodeModal();
  } else if (mode === 'pin') {
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
  if (!distance || distance <= 0) {
    alert("Please enter a valid distance.");
    return;
  }
  if (selectedMode === 'mylocation') {
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      startLatLng = { lat, lng };
      buildRoute(lat, lng, distance);
    }, () => {
      alert("Could not get your location.");
    });
  } else if (selectedMode === 'postcode' || selectedMode === 'pin') {
    if (!startLatLng) {
      alert("Please set your starting point first.");
      return;
    }
    buildRoute(startLatLng.lat, startLatLng.lng, distance);
  }
}

function buildRoute(lat, lng, distance) {
  hasStartedWalking = false;
  directionsRenderer.setMap(null);
  directionsRenderer.setMap(map);

  const waypoints = [];
  const numPoints = 6;
  const radiusInKm = (distance * 1.60934) / (2 * Math.PI); // miles to km

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

function startNavigation() {
  if (!map || !startLatLng) {
    alert("Please generate a route first!");
    return;
  }
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
      map.setCenter(pos);
      if (!userMarker) {
        userMarker = new google.maps.Marker({
          position: pos,
          map: map,
          title: "You are here",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#00F",
            fillOpacity: 0.8,
            strokeWeight: 2,
            strokeColor: "#fff"
          }
        });
      } else {
        userMarker.setPosition(pos);
      }
      const distToStart = getDistanceFromLatLonInMeters(pos.lat, pos.lng, startLatLng.lat, startLatLng.lng);
      if (!hasStartedWalking && distToStart > 50) hasStartedWalking = true;
      if (hasStartedWalking && distToStart < 20) {
        alert("Congrats! You've completed your route 🎉");
        stopNavigation();
      }
      highlightCurrentStep(pos);
    },
    () => alert("Error tracking your location."),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
  document.getElementById("startNavigation").disabled = true;
  document.getElementById("stopNavigation").style.display = "inline-block";
}

function highlightCurrentStep(userPos) {
  let closestIdx = -1;
  let closestDist = Infinity;
  navigationSteps.forEach((step, i) => {
    const lat = step.start_location.lat();
    const lng = step.start_location.lng();
    const dist = getDistanceFromLatLonInMeters(userPos.lat, userPos.lng, lat, lng);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });
  if (closestIdx !== -1) {
    navigationSteps.forEach((_, i) => {
      const el = document.getElementById(`step-${i}`);
      if (el) el.style.backgroundColor = i === closestIdx ? "#c1eaff" : "";
    });
  }
}

function stopNavigation() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    alert("Navigation stopped.");
    document.getElementById("startNavigation").disabled = false;
    document.getElementById("stopNavigation").style.display = "none";
  }
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

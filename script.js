const directionsService = new google.maps.DirectionsService();
const directionsRenderer = new google.maps.DirectionsRenderer();
let map;
let userMarker;
let watchId;
let startLatLng; // To store the starting point for completion detection

function initMap(lat, lng) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat, lng },
    zoom: 14,
  });
}

function getRoute() {
  const distance = document.getElementById("distance").value;
  if (!distance || distance <= 0) {
    alert("Please enter a valid distance in km.");
    return;
  }

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    startLatLng = { lat, lng };
    initMap(lat, lng);

    // Draw radius circle for visual reference
    new google.maps.Circle({
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.15,
      map,
      center: { lat, lng },
      radius: distance * 500, // half distance radius
    });

    // Generate dynamic waypoints around the circle
    const waypoints = [];
    const numPoints = 6; // Adjust for smoothness
    const radiusInKm = (distance / (2 * Math.PI)); // radius to get loop distance

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const dx = radiusInKm * Math.cos(angle);
      const dy = radiusInKm * Math.sin(angle);

      const pointLat = lat + (dy / 111); // ~111 km per degree latitude
      const pointLng = lng + (dx / (111 * Math.cos(lat * (Math.PI / 180))));

      waypoints.push({
        location: { lat: pointLat, lng: pointLng },
        stopover: true,
      });
    }

    const request = {
      origin: { lat, lng },
      destination: { lat, lng },
      travelMode: 'WALKING',
      waypoints: waypoints,
      optimizeWaypoints: false,
    };

    directionsRenderer.setMap(map);
    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        document.getElementById("startNavigation").style.display = "inline-block";
      } else {
        console.error("Directions request failed: " + status);
        alert("Could not generate route. Try a different distance or location.");
      }
    });
  }, (error) => {
    console.error("Geolocation error: ", error);
    alert("Could not get your location. Please allow location access.");
  });
}

function startNavigation() {
  if (!map) {
    alert("Please generate a route first!");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;
      const pos = { lat: currentLat, lng: currentLng };

      // Center the map on user's current position
      map.setCenter(pos);

      // Place or update a marker to track user position
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

      // Check if user has returned to start (within ~20 meters)
      const distanceToStart = getDistanceFromLatLonInMeters(currentLat, currentLng, startLatLng.lat, startLatLng.lng);
      if (distanceToStart < 20) {
        alert("Congrats! You've completed your route 🎉");
        stopNavigation(); // Auto-stop tracking
      }
    },
    (error) => {
      console.error("Tracking error: ", error);
      alert("Error tracking your location.");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    }
  );

  document.getElementById("startNavigation").disabled = true;
  document.getElementById("stopNavigation").style.display = "inline-block";
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

// Helper function to calculate distance between two lat/lng points (Haversine)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in meters
  return d;
}

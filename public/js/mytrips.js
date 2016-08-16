var app = angular.module('displayTripsApp', ['ui.bootstrap.datetimepicker']);
app.service('tripformat', function () {
  var trips = [];
  this.getTrips = function() {
    return trips;
  }
  this.getTrip = function(key) {
    return trips[key];
  }
  this.getKeys = function() {
    return Object.keys(trips);
  } 
  this.setData = function(value) {
    trips = [];
    var len = Object.keys(value).length;
    var i = len - 1;
    for(var tripid in value) {
      var trip = value[tripid]; 
      trip.tripid = tripid;
      var time = new Date(trip.starttime);
      var postfix = "am";
      if(time.getHours() >= 12) postfix = "pm";
      trip.displaytime = (time.getMonth() + 1) + "/" + time.getDate() + "-" + time.getHours() + ":" + time.getMinutes() + postfix;
      trips[i--] = trip; 
    }
  }
});


app.controller('displayTripsCtrl', function($scope, $http, tripformat){ 
  $scope.showTrip = function($curtrip) {
    var method = $scope.radioValue;
    displayTrip($curtrip, method); 
  };

  $scope.search = function(date) {
    var next;
    if (date.getMonth() == 11) {
      next = new Date(date.getFullYear() + 1, 0, 1);
    } else {
      next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }
    console.log("search from:" + date.getTime() + " to:" + next.getTime());
    $http({
      url: '/searchtrips',
      method: "POST",
      data: {'start':date.getTime(), 'end':next.getTime() }
    }).then(function(res) {
      if(res.data.status == "success") {
        tripformat.setData(res.data.data);
        $scope.trips = tripformat.getTrips();       
        $scope.setClickedRow(0); 
        $scope.onTimeSet(date, next);
      } else {
        alert("search failed on the server, try again later!");
      } 
    });  
  };

 $scope.init = function() {
    $scope.radioValue = "speed";
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    $scope.dateDropDownInput = firstDay;
    $scope.dateDropDownDisplay = (date.getMonth() + 1) + "/" + date.getFullYear();
    $scope.search(firstDay);
  };
  $scope.init();


  $scope.onTimeSet = function(date, oldDate) {
    $scope.dateDropDownInput = date;
    $scope.dateDropDownDisplay = (date.getMonth() + 1) + "/" + date.getFullYear();
  };

  $scope.searchLastMonth = function() {
    var date = $scope.dateDropDownInput;
    var last;  
    if (date.getMonth() == 0) {
      last = new Date(date.getFullYear() - 1, 12, 1);
    } else {
      last = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    } 
    $scope.search(last);
  }

  $scope.searchNextMonth = function() {
    var date = $scope.dateDropDownInput;
    var next;  
    if (date.getMonth() == 11) {
      next = new Date(date.getFullYear() + 1, 0, 1);
    } else {
      next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }
    $scope.search(next);
  }

 
  $scope.setClickedRow = function(index){
    $scope.selectedRow = index;
    $scope.curtrip = $scope.trips[index];  
    console.log(index + " is clicked");
    $scope.showTrip($scope.curtrip);
  }
  $scope.removeTrip = function(index) {
    var deletetrip = confirm('Are you sure you want to delete (unrecoverable)?');
    if (!deletetrip) {
      return; 
    }  
    $http({
        url: '/removetrip',
        method: "POST",
        data: { 'tripid' : $scope.trips[index].tripid }
    }).then(function(res) {
      if(res.data.status == "success") {
        //delete locally
        $scope.trips.splice(index, 1);    
        var len = Object.keys($scope.trips).length;
        $scope.curtrip = $scope.trips[index%len];  
        $scope.showTrip($scope.curtrip);
        $scope.setClickedRow(index%len);
      } else {
        alert("delete failed on the server, try again later!");
      } 
    });  
  } 

});


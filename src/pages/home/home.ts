import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgZone } from '@angular/core';
import firebase from 'firebase';

declare var google;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  private eventForm: FormGroup;

  location = {
    id: null,
    lat: null,
    lng: null,
    name: null,
  };

  GoogleAutocomplete: any;
  autocomplete: any;
  autocompleteItems: any;
  GoogleGeocoder: any;

  startDate: any;
  endDate: any;
  startTime: any;
  endTime: any;
  startTimestamp: any;
  endTimestamp: any;

  constructor(public navCtrl: NavController, private formBuilder: FormBuilder, private zone: NgZone) {    
    var currentDateTime = new Date();
    //ion-datetime requires ISO format, use getTimezoneOffset to turn local date into XXXX-XX-XX format
    var currentDateTimeISOFormat = new Date(currentDateTime.getTime() - currentDateTime.getTimezoneOffset()*60000).toISOString();
    this.startDate = currentDateTimeISOFormat.substr(0, 10);
    this.endDate = currentDateTimeISOFormat.substr(0, 10);
    this.startTime = currentDateTimeISOFormat.substr(11, 5);
    this.endTime = currentDateTimeISOFormat.substr(11, 5);

    this.eventForm = this.formBuilder.group({
      pickEventStartDate: ['', Validators.required],
      pickEventEndDate: ['', Validators.required],
      pickEventStartTime: ['', Validators.required],
      pickEventEndTime: ['', Validators.required],
      address: ['', Validators.required],
      proximity: ['', Validators.compose([Validators.required, Validators.pattern('^[0-9]*$')])],
    }, { validator: this.dateLessThan() });

    this.GoogleAutocomplete = new google.maps.places.AutocompleteService();
    this.autocomplete = { input: '' };
    this.autocompleteItems = [];
    this.GoogleGeocoder = new google.maps.Geocoder();
  }
  
  dateLessThan() {
    return (group: FormGroup): { [key: string]: any } => {
      this.startTimestamp = new Date(this.startDate + ' ' + this.startTime).getTime();
      this.endTimestamp = new Date(this.endDate + ' ' + this.endTime).getTime();
      if(this.startTimestamp<this.endTimestamp){
        return{}
      }
      else{
        return{
          m: "Start Date should be equal or less than End Date"
        }
      }
    }
  }

  updateSearchResults() {
    if (this.autocomplete.input == '') {
      this.autocompleteItems = [];
      return;
    }
    this.GoogleAutocomplete.getPlacePredictions({ input: this.autocomplete.input }, (predictions, status) => {
      if (status == google.maps.places.PlacesServiceStatus.OK && predictions) {
        this.autocompleteItems = [];
        this.zone.run(() => {
          predictions.forEach((prediction) => {
            this.autocompleteItems.push(prediction);
          });
        });
      }
    });
  }

  selectSearchResult(item) {
    this.autocompleteItems = [];
    this.autocomplete.input = item.description;

    this.GoogleGeocoder.geocode({ 'placeId': item.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        this.location.id = results[0].place_id;
        this.location.lat = results[0].geometry.location.lat();
        this.location.lng = results[0].geometry.location.lng();
        this.location.name = results[0].formatted_address;
      }
    })
  }

  create() {
    var d = new Date(this.eventForm.value.pickEventEndDate + ' ' + this.eventForm.value.pickEventEndTime);
    var endTimestamp = d.getTime();

    firebase.database().ref('event/').push().set({
      id: this.location.id + Date.now(),
      latitude: this.location.lat,
      longitude: this.location.lng,
      name: this.location.name,
      proximity: this.eventForm.value.proximity,
      startDate: this.eventForm.value.pickEventStartDate,
      endDate: this.eventForm.value.pickEventEndDate,
      startTime: this.eventForm.value.pickEventStartTime,
      endTime: this.eventForm.value.pickEventEndTime,
      endTimestamp: endTimestamp,
    });
  }
}

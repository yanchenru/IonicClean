import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { TabsPage } from '../pages/tabs/tabs';

import { AlertController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';
import { BackgroundMode } from '@ionic-native/background-mode';
import { LocalNotifications } from '@ionic-native/local-notifications';
import firebase from 'firebase';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage: any = TabsPage;

  events: any;

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, private alertCtrl: AlertController, 
    private geolocation: Geolocation, private backgroundMode: BackgroundMode, private localNotifications: LocalNotifications) {
    platform.ready().then(() => {
      statusBar.styleDefault();
      splashScreen.hide();

      this.backgroundMode.enable();
      this.startFirebase();
      this.startGeolocation();
    });
  }

  startFirebase() {
    var self = this;

    var config = {
      apiKey: "AIzaSyBf9TgCufrwNYEfPJ6fShLGeMnnFK1hSIM",
      authDomain: "ionic-214905.firebaseapp.com",
      databaseURL: "https://ionic-214905.firebaseio.com",
      projectId: "ionic-214905",
      storageBucket: "ionic-214905.appspot.com",
      messagingSenderId: "121679175196"
    };
    firebase.initializeApp(config);

    var eventRef = firebase.database().ref('event/');
    eventRef.once('value').then(function (snapshot) {
      self.events = snapshot;
    })
    eventRef.orderByChild("endTimestamp").startAt(Date.now()).on('value', function (snapshot) {
      self.events = snapshot;
      console.log(self.events);
    });
  }

  startGeolocation() {
    var self = this;
    var preDis = {};

    this.geolocation.watchPosition().subscribe(position => {
      if (self.events != null && self.events != undefined) {
        self.events.forEach(function (event) {
          let distance = self.calculateDistance(event.val().latitude, position.coords.latitude, event.val().longitude, position.coords.longitude);

          //console.log('distance: ' + distance);

          if (preDis[event.val().id] == null) {
            preDis[event.val().id] = event.val().proximity;
          }
          if (distance < event.val().proximity && preDis[event.val().id] >= event.val().proximity) {
            console.log('background track, enter event zone');
            self.sendNotification(event.val().name, event.val().startDate);
          }
          preDis[event.val().id] = distance;
        })
      }
    });
  }

  calculateDistance(lat1, lat2, lng1, lng2) {
    let p = 0.017453292519943295;    // Math.PI / 180
    let c = Math.cos;
    let a = 0.5 - c((lat1 - lat2) * p) / 2 + c(lat2 * p) * c((lat1) * p) * (1 - c(((lng1 - lng2) * p))) / 2;
    let dis = (12742 * Math.asin(Math.sqrt(a))); // 2 * R; R = 6371 km

    return dis * 1000;
  }

  sendNotification(place, startDate) {
    this.localNotifications.schedule({
      id: 1,
      title: 'Event',
      text: 'at ' + place + ', on ' + startDate + '. Join?',
      actions: [{ id: 'yes', title: 'Yes' }, { id: 'no', title: 'No' }]
    });

    this.localNotifications.on('yes').subscribe(() => {
      let alert = this.alertCtrl.create({
        title: 'Welcome',
        subTitle: 'Looking forward to see you',
        buttons: ['Dismiss']
      });
      alert.present();
    })
  }
}

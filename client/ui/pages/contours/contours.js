/**
 * Created by thana on 9/15/2016.
 */

import { mapColors } from '/imports/api/maps/maps.js';
import { Satellites } from '/imports/api/satellites/satellites';
import { Transponders } from '/imports/api/transponders/transponders';


Template.contours.viewmodel({
    onCreated(){
        Meteor.subscribe('allThaicomSatellites');
        Meteor.subscribe('transpondersWithDefinedContours');
    },
    onRendered(){
        $('.select-picker').selectpicker();
    },
    satellites() {
        return Satellites.find().fetch().map((satellite) => {
            return {
                id: satellite.name,
                name: satellite.name,
            };
        });
    },
    selectedSatellite: '',
    selectedValueToDisplay: '',
    selectedValueType: '',
    selectedInputMethod: '',
    isConventional() {
      if (this.selectedSatellite()) {
          return this.checkSatelliteType(this.selectedSatellite(), 'Conventional');
      }
      return false;
    },
    isHts() {
        if (this.selectedSatellite()) {
            return this.checkSatelliteType(this.selectedSatellite(), 'HTS');
        }
        return false;
    },
    checkSatelliteType(name, typeToCheck) {
        return Satellites.findOne({name: name}).type === typeToCheck;
    },
    beamsAndDefinedContourSelected: false,
    pasteFromExcelSelected: false,
    countries() {
      if (this.isHts()) {
          // Get all countries from the transponders
          let transponders = Transponders.find({ satellite: this.selectedSatellite() }).fetch();
          let countries = [];
          // Each transponder stores the array of country that it covers. To list all the countries, we iterate through
          // each transponder and keep union the array of country
          transponders.forEach((tp) => {
              countries = _.union(countries, tp.countries);
          });
          // Return the sorted list alphabetically
          return countries.sort();
      }
      return [];
    },
    selectedCountry: '',
    isCountrySelected() {
        return this.selectedCountry() != '';
    },
    countryChanged(event){
        //$('.select-picker').selectpicker();
       let $beamPicker = $('#hts-beam-picker');
        $beamPicker.find($('option')).remove();
        if (this.selectedCountry()) {
            let transponders = Transponders.find({
                countries: {
                    $in: [this.selectedCountry()]
                }
            }).fetch();
            let options =  transponders.map((tp) => {
                return `<option value="${tp._id}">${tp.name}-${tp.path}</option>`;
            });
            $beamPicker.append(options).selectpicker('refresh');
        }
    },
    selectedDefinedContours: [],
    contours: '',
    contourColors: [],
    contourSubmitted(event) {
        event.preventDefault();

        let self = this;
        let satellite = self.selectedSatellite();
        let parameter = self.selectedValueToDisplay();
        let valueType = self.selectedValueType();
        let contours = [];

        if (!satellite) {
            Bert.alert('Please select a satellite', 'danger', 'fixed-top');
            return false;
        }
        if (!parameter) {
            Bert.alert('Please select either EIRP or G/T', 'danger', 'fixed-top');
            return false;
        }
        if (!valueType) {
            Bert.alert('Please select either absolute value or relative from peak value', 'danger', 'fixed-top');
            return false;
        }

        // HTS + Beams and Defined Contours
        if(this.beamsAndDefinedContourSelected()) {

            // Get select transponders from dropdown, the value are transponder Ids
            let selectedTransponderIds = $('#hts-beam-picker').val();

            // Get the selected defined contours from checkboxes
            let selectedDefinedContours = this.selectedDefinedContours();
            console.log(JSON.stringify(selectedTransponderIds));
            console.log(JSON.stringify(selectedDefinedContours));

            // User does not select any beam
            if (selectedTransponderIds.length == 0) {
                Bert.alert('Please select at least 1 beam', 'danger', 'fixed-top');
                return false;
            }

            // User does not select any defined contours
            if (selectedDefinedContours.length == 0) {
                Bert.alert('Please select as least 1 defined contour', 'danger', 'fixed-top');
                return false;
            }

            // Convert selected transponder and selected defined contours into contours object to send to the server
            contours = convertBeamAndDefinedContoursToObject(selectedTransponderIds, selectedDefinedContours);
        }

        // Paste from Excel
        if(this.pasteFromExcelSelected()) {



            // Convert the textarea paste from excel input into contours
            contours = convertContoursTableToObject(self.contours());
        }

        // Alert if contours object to send to database is undefined
        if (!contours) {
            Bert.alert('Please put contours in the correct format', 'danger', 'fixed-top');
            return false;
        }

        let options = {
            satellite: satellite,
            parameter: parameter,
            valueType: valueType,
            contours: contours,
        };

        // Request the server to give plots from our request with contour objects
        Meteor.call('findContoursToPlot', options, (error, result) => {
            if (error) {
                Bert.alert(error.reason, 'danger', 'fixed-top');
            }
            else {
                self.mapData({
                    geojsonData: result.resultContour,
                    beamLabels: result.beamLabels,
                });
                self.applyFormatting();
                self.renderMap();
                if(result.notFoundMessages && result.notFoundMessages.length > 0) {
                    self.logMessages(result.notFoundMessages);
                    // Construct the message
                    let listMessages = result.notFoundMessages.map((msg) => {
                        return `<li>${msg}</li>`;
                    })
                    Bert.alert(`<ul>${listMessages.join('')}</ul>`, 'danger', 'fixed-top');

                } else {
                    self.logMessages([]);
                }
            }
        });


        function convertBeamAndDefinedContoursToObject(transponderIds, definedContours) {
            // Example of contour object { name: '101', path: 'forward', value: -4.5 }
            let resultContours = [];

            // Loop through each given transponder ID and defined contours
            transponderIds.forEach((tpId) => {
                for (let i = 0; i < definedContours.length; i++) {
                    let transponder = Transponders.findOne({_id: tpId });

                    // Find the value of defined contours from the 'definedContours' property of transponder
                    // Example object: "definedContours": [{ location: "50%", value: -2.5 }, { location: "eoc", value: -4.5 }]
                    let location = definedContours[i] == 'eoc-2' ? 'eoc' : definedContours[i];
                    let definedContour = _.findWhere(transponder.definedContours, { location: location });

                    // if defined contour is found, push it to the contours object array, otherwise, do nothing.
                    // There is some case where the defined contours is not found, such as 50% on shape beam
                    if (definedContour) {
                        console.log(JSON.stringify({
                            name: transponder.name,
                            path: transponder.path,
                            value: definedContours[i] == 'eoc-2' ? definedContour.value -2 : definedContour.value,
                        }));
                        resultContours.push({
                            name: transponder.name,
                            path: transponder.path,
                            value: definedContours[i] == 'eoc-2' ? definedContour.value -2 : definedContour.value,
                        });
                    }
                }
            });
            return resultContours;
        }

        function convertContoursTableToObject(contours) {

            // If string contains only whitespaces, return false
            // http://stackoverflow.com/questions/10261986/detect-string-which-contain-only-spaces
            /*
            if (!contours.replace(/\s/g, '').length) {
                // string only contained whitespace (ie. spaces, tabs or line breaks)
                return false;
            }
            */

            let rows = contours.split('\n');
            let formattedContours = [];

            rows.forEach((row) => {

                let columns = row.split('\t');

                if (columns.length < 2 || columns.length > 3) {
                    return false;
                }
                let contourLine = {};

                // 1st column = beam name
                if (!columns[0]) return false;
                contourLine.name = columns[0];

                // 2nd column = path (fwd, rtn) for HTS, = value for conventional
                if (columns.length == 3) { // HTS
                    let path = columns[1].toLowerCase();
                    if(_.contains(['forward','fwd'], path)) {
                        path = 'forward';
                    }
                    else if (_.contains(['return', 'rtn'], path)) {
                        path = 'return';
                    }
                    else return false;
                    contourLine.path = path;

                    let value = columns[2];
                    if(isNaN(value)) {
                        return false;
                    }
                    contourLine.value = +value;
                }

                // 2nd column = path (fwd, rtn) for HTS, = value for conventional
                if (columns.length == 2) { // Conventional
                    let value = columns[1];
                    if(isNaN(value)) {
                        return false;
                    }
                    contourLine.value = +value;
                }
                formattedContours.push(contourLine);
            });

            if(formattedContours.length == 0) {
                return false;
            }
            return formattedContours;
        }
    },
    logMessages: [],
    mapData:{
            geojsonData: {
                "type": "FeatureCollection",
                "features": [{
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [100.514112, 13.859462],
                    },
                }],
            }
    },
    mapHeight: '700px',
    showLabel: true,
    showLabelChanged() {
        this.applyFormatting();
        this.renderMap();
    },
    labelFontSize: 12,
    increaseLabelFontSize(event) {
        event.preventDefault();
        let currentLabelFontSize = this.labelFontSize();
        console.log('Current = ' + currentLabelFontSize);
        this.labelFontSize(currentLabelFontSize + 2);
        console.log('New = ' + this.labelFontSize());
        this.applyFormatting();
        this.renderMap();
    },
    decreaseLabelFontSize(event) {
        event.preventDefault();
        let currentLabelFontSize = this.labelFontSize();
        if (currentLabelFontSize >= 1) {
            this.labelFontSize(currentLabelFontSize - 2);
        }
        this.applyFormatting();
        this.renderMap();
    },
    strokeWeight: 1,
    increaseStrokeWeight(event) {
        event.preventDefault();
        let currentWeight = this.strokeWeight();
        this.strokeWeight(currentWeight + 1);
        this.applyFormatting();
        this.renderMap();
    },
    decreaseStrokeWeight(event) {
        event.preventDefault();
        let currentWeight = this.strokeWeight();
        // The stroke weight cannot be less than zero
        if (currentWeight >= 0) {
            this.strokeWeight(currentWeight - 1);
        }
        this.applyFormatting();
        this.renderMap();
    },
    showChangeColorButton: false,
    initialColors() {
        return mapColors.map((color, index) => {
            return {
                index: index + 1,
                color, color,
            };
        });
    },
    colorChanged(event) {
        event.preventDefault();
        let colors = [];
        // Loop through the color picker table
        $('.colorPicker input').each((index, item) => {
            console.log(item.value);
            colors.push({
                index: index,
                color: item.value,
            })
        });

        this.contourColors(colors);
        this.applyFormatting();
        this.renderMap();
    },
    applyFormatting() { // Apply the formatting set in this page to map data

        // Labels Visibility and Font Size
        this.mapData().beamLabels.forEach((label) => {
            label.visible = this.showLabel();
            label.fontSize = this.labelFontSize();
        });

        let distinctCategories = [];
        let colorChoices = this.contourColors().length == 0 ? this.initialColors() : this.contourColors();

        this.mapData().geojsonData.features.forEach((feature) => {
            let geometry = feature.geometry;
            // Only apply formatting on Polygon objects
            if(geometry.type === 'Polygon') {
                // Set stroke weight with the current stroke weight value
                feature.properties.strokeWeight = this.strokeWeight();

                // Assign color based on categories
                let category = feature.properties.category;

                if (category) {
                    // if this category did not appear in the previous contour lines (new one), push it into array
                    if (distinctCategories.indexOf(category) < 0) {
                        distinctCategories.push(category);
                    }

                    // In some case where the current color array has lesser elements than category, change to initial colors
                    if (distinctCategories.length > colorChoices.length) {
                        colorChoices = this.initialColors();
                    }

                    // Select the color based on the index of category. For example, if there is category "A" and "B",
                    // Contours in category "A" will get the first color in the mapColors array and all lines in category "B"
                    // will get the 2nd color in the array.
                    feature.properties.color = colorChoices[distinctCategories.indexOf(category)].color;
                }
            }
        });
        // Reduce the color choices array to make it equal to the number of categories and set it to contourColors array
        // This is to set the contourColors array for the first time when the number of categories are unknown
        this.contourColors(colorChoices.slice(0, distinctCategories.length));
        this.renderPickerColor();
        //console.log(JSON.stringify(this.mapData()));
    },
    renderPickerColor(){
        $('.colorPickerContainer').empty();
        Blaze.renderWithData(Template.colorPickers, {
            contourColors: this.contourColors(),
        } , $('.colorPickerContainer')[0]);
    },
    renderMap() {
        $('.map-container').empty();
        Blaze.renderWithData(Template.geojsonPreview, {
            mapData: this.mapData(),
            mapHeight: this.mapHeight(),
        } , $('.map-container')[0]);
    }
});

Template.colorPickers.viewmodel({
    onRendered() {
        $('.colorPicker').colorpicker().on('changeColor', function (e) {
            // Simulate the change color button in parent template (contour template) click to trigger color change
            console.log('clicked');
            $('.change-color').click();
        });
    },
});
/**
 * Created by thana on 1/11/2017.
 */

Template.faqs.viewmodel({
    questions() {
        let questions = [
            {
                title: `What is the source of our database?`,
                answer: `We export .gxt data from the software called Satsoft, which we normally use to generate the satellite contours on the map. Then, .gxt file is read and transformed into GeoJson format to store in our MongoDB database`,
            },
            {
                title: `It says 'No coverage' for my location`,
                answer: `The input location is searched against all polygons of contour lines in our database. It returns the polygon with 
                highest value containing that location. Therefore, there might be a chance that the input location is just beyond the edge of the
                least value polygon stored in our database. Although, we are quite confident that our selected polygons are an accurate representation
                of Thaicom satellite coverage. So if the program says 'No coverage', it's more likely that the location is not appropriate to use our 
                satellite because of too low power or too low elevation angle.`
            },
            {
                title: `My input location is within some value of EIRP or G/T, does it mean the link can be closed?`,
                answer: `Not necessary. It also depends on the antenna size, elevation angle, and other factors. EIRP or G/T map is just one condition to
                determine if the location can be served by this satellite. Please consult link budget engineers for further information.`
            },
            {
                title: `The contour has rough edges when I zoom in, is there a way to make it smoother? (more like ellipse)`,
                answer: `Unfortunately, no. We limited the smoothness of polygon (Whittaker Interpolation Density parameter in SatSoft) to prevent too many
                points per polygon to reduce the memory in our database.`
            },
            {
                title: `The polygon on this website is not exactly the same as in SatSoft`,
                answer: `Please check the Whittaker Interpolation Density parameter (under component contours) in SatSoft. For our database, we exported the
                HTS beams with Density = 2 and for conventional beams Density = 1.`
            },
            {
                title: `Who selected the contour lines for our database?`,
                answer: `CND for conventional satellite beams and CSD for HTS beams.`
            },
            {
                title: `Thaicom 7 Semi Global Beam is not working`,
                answer: `The exported gxt file of semi-global beam requires a hand-fix to complete polygons. We will try to fix this ASAP. `
            },
            {
                title: `I believe some contours in this database is incorrect....`,
                answer: `Email your findings to thanatv@thaicom.net so we can review this.`
            },
            {
                title: `I have more questions..`,
                answer: `Feel free to submit your inquiries to thanatv@thaicom.net. We will make sure that your problems get answered!!`,
            }
        ];
        questions.forEach((q, index) => {
            q.heading = `heading${index}`;
            q.collapseId = `collapse${index}`;
        });
        return questions;
    }
});
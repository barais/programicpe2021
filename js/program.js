var converter = new showdown.Converter();
var modelsApp = angular.module("models-app", []);
modelsApp.filter('unsafe', function ($sce) {
    return $sce.trustAsHtml;
});

modelsApp.controller("ProgramController", function ($scope, $window) {

    // Utils
    function parseTime(time) {
        var splittedTime = time.split(":");
        return {
            hour: parseInt(splittedTime[0]),
            minutes: parseInt(splittedTime[1])
        }
    }

    $scope.getStartOfSessionGroup = function (sessionGroup) {
        return sessionGroup[0].start;
    };

    $scope.getEndOfSessionGroup = function (sessionGroup) {
        var maxEnd = "00:00";
        sessionGroup.forEach(function (session) {
            if (typeof session.end !== "undefined") {
                var parsedSessionEnd = parseTime(session.end);
                var parsedMaxEnd = parseTime(maxEnd);
                if (parsedSessionEnd.hour > parsedMaxEnd.hour || (parsedSessionEnd.hour == parsedMaxEnd.hour && parsedSessionEnd.minutes > parsedMaxEnd.minutes)) {
                    maxEnd = session.end;
                }
            }
        });
        return maxEnd;
    };


    var hiddenTypes = ["Poster", "SRC", "DoctoralSymposium", "Clinic", "EducatorSymposium", "Reception", "Opening"];

    $scope.hideType = function (talkType) {
        return typeof talkType === "undefined" || hiddenTypes.indexOf(talkType) !== -1
    };

    var hiddenModalsAndStars = ["Lunch", "CoffeeBreak", "Reception"];
    $scope.showModalAndStar = function (talkType) {
        return typeof talkType !== "undefined" && hiddenModalsAndStars.indexOf(talkType) === -1
    };



    ////// Preprocess data //////

    $scope.data = data;

    ////// Favorites /////

    try {

        if (typeof localStorage !== 'undefined') {
            $scope.showFavorites = localStorage.getItem("showFavorites") === "true";
        } else {
            $scope.showFavorites = false
        }

        // Retrieve favorite talks from local storage
        if (typeof (Storage) !== "undefined" && typeof localStorage !== 'undefined') {
            $scope.favoriteTalks = JSON.parse(localStorage.getItem("favoriteTalks"));
            if ($scope.favoriteTalks === null) {
                $scope.favoriteTalks = {};
            }
        } else {
            $scope.favoriteTalks = {};
        }
    } catch (error) {
        //console.error(error);
        // expected output: ReferenceError: nonExistentFunction is not defined
        // Note - error messages will vary depending on browser
        $scope.favoriteTalks = {};
    }


    $scope.data.forEach(function (day) {
        day.sessionGroups.forEach(function (sessionGroup) {
            sessionGroup.forEach(function (session, roomIndex) {
                if (typeof session.events !== "undefined") {
                    session.events.forEach(function (event) {
                        if (typeof event.papers === "undefined") {
                            event.selected = $scope.favoriteTalks[event.title + session.icalStart];
                        } else {
                            event.papers.forEach(function (talk) {
                                talk.selected = $scope.favoriteTalks[talk.title + talk.icalStart];
                            });
                        }
                    });
                }
            });
        });
    });

    $scope.toggleFavorites = function () {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem("showFavorites", $scope.showFavorites);
            }
        } catch (error) {

        }
    };

    $scope.toggleFavoriteTalk = function (talk, date) {
        talk.selected = !talk.selected;
        $scope.favoriteTalks[talk.title + date] = talk.selected;
        try {
            if (typeof (Storage) !== "undefined" && typeof localStorage !== 'undefined') {
                localStorage.setItem("favoriteTalks", JSON.stringify($scope.favoriteTalks));
            }
        } catch (error) {

        }
    };

    $scope.showColor = function (event) {
        var atLeastOneSelected = false;
        if (typeof event.papers !== 'undefined') {
            event.papers.forEach(function (talk) {
                atLeastOneSelected = atLeastOneSelected || talk.selected;
            });
        } else {
            atLeastOneSelected = event.selected;
        }

        return !$scope.showFavorites || ($scope.showFavorites && atLeastOneSelected);
    };



    ///// Export to iCal /////
    function hash(string) {
        var hash = 0;
        if (string.length == 0) return hash;
        for (i = 0; i < string.length; i++) {
            var charI = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + charI;
            hash = hash & hash;
        }
        return hash;
    }


    function createEvent(calendar, edate, start, end, title, description, location, event1) {
        calendar.push("BEGIN:VEVENT");
        //        calendar.push("DTSTART;TZID=Europe/Paris:" + toITCFormat(edate,start));
        calendar.push("DTSTART:" + toITCFormat(edate, start));
        calendar.push("DTEND:" + toITCFormat(edate, end));
        calendar.push("DTSTAMP:" + toITCFormat(edate, start));
        //        calendar.push("DTEND;TZID=Europe/Paris:" + toITCFormat(edate,end));
        //        calendar.push("DTSTAMP;TZID=Europe/Paris:" + toITCFormat(edate,start));
        calendar.push("ORGANIZER;CN=icpe2021-gc@inria.fr:mailto:icpe2021-gc@inria.fr");
        calendar.push("UID:" + toITCFormat(edate, end) + "-" + hash(title) + "@icpe2021.irisa.fr");

       /* if (event1.papers != undefined) {
            event1.papers.forEach(function (talk, talkIndex) {
                console.log(talk);
        });
    }*/
    
    const regex = /\n/g;
    let longdesc = '';
    let shortdesc = '';
    if (event1.description != undefined){
        longdesc =  converter.makeHtml(event1.description);
        shortdesc = event1.description
    } else if (event1.program != undefined) {
        longdesc =  converter.makeHtml(event1.program);
        shortdesc = event1.program
    } else if(event1.papers != undefined ){
        /*papers: [{
            authors: [{
                    name: "Axel Busch",
                },
                {
                    name: "Martin Kammerer",
                },
            ],
            title: "Network Performance Influences of Software-defined Networks on Micro-service Architectures",
            type: "REGULAR INDUSTRY",

        },*/
        event1.papers.forEach( (paper, talkIndex) => {
            longdesc = longdesc + '<b>' + paper.title + '</b> - ' + paper.authors.map(a => a.name).join(', ') +  '. <i>' + paper.type + '</i>. <br>' ;
            shortdesc = shortdesc + ' - ' + paper.title + ' - ' + paper.authors.map(a => a.name).join(', ') +  '. ' + paper.type + '\n' ;
            
        });

    }else {
        longdesc = description;
        shortdesc = description;
    }
    

        calendar.push("DESCRIPTION:" + shortdesc.replace(regex,'\n ').replace(/(.{75})/g, "$1\n ")); // TODO : max line is 75 characters
        calendar.push("X-ALT-DESC;FMTTYPE=text/html:" + longdesc.replace(regex,'\n ').replace(/(.{75})/g, "$1\n\ ")); // TODO : max line is 75 characters
        
        calendar.push("LOCATION:" + location);
        calendar.push("SUMMARY:" + title); // TODO : max line is 75 characters
        calendar.push("END:VEVENT");
    }

    $scope.exportToCal = function (favoritesOnly) {

        // Create calendar
        var calendar = [];
        calendar.push("BEGIN:VCALENDAR");
        calendar.push("VERSION:2.0");
        calendar.push("PRODID:-//ICPE2021//Program");

        $scope.data.forEach(function (day) {

            day.sessionGroups.forEach(function (sessionGroup) {
                if (sessionGroup.length > 0) {
                    sessionGroup.forEach(function (session, roomIndex) {
                        if (typeof session.events !== "undefined") {
                            session.events.forEach(function (event, eventIndex) {

                                
                                    if (!favoritesOnly || ((typeof event.selected !== "undefined") && event.selected === true)) {
                                        createEvent(calendar, session.date, session.start, session.end, event.title, event.title, session.room,event); // TODO : description
                                    }
                                    /*if (typeof event.papers !== "undefined") {
                                        event.papers.forEach(function (talk, talkIndex) {
                                        if (!favoritesOnly || ((typeof talk.selected !== "undefined") && talk.selected === true)) {
                                            if (talk.date == undefined || talk.start == undefined || talk.end == undefined) {
                                                createEvent(calendar, session.date, session.start, session.end, talk.title, talk.title, session.room); // TODO : description
                                            } else {
                                                createEvent(calendar, talk.date, talk.start, talk.end, talk.title, talk.title, session.room); // TODO : description
                                            }
                                        }
                                    });
                                }*/


                            });
                        }
                    });
                }
            });
        });

        calendar.push("END:VCALENDAR");
        var file = calendar.join("\n");

        // Download file
        var blob = new Blob([file], {
            type: 'text/calendar'
        });
        var inlinedDataUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(file);
        var filename = "icpe2021.ics";
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        } else {
            var elem = window.document.createElement('a');

            if (window.URL) {
                elem.href = window.URL.createObjectURL(blob);
            } else {
                elem.href = window.webkitURL.createObjectURL(blob);
            }
            // elem.href = inlinedDataUrl;
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);

            // var reader = new FileReader();
            // reader.onloadend = function(e) {
            //     console.log(reader);
            //     $window.open(reader.result);
            // };
            // reader.readAsDataURL(blob); //
        }
    };

    ///// Info on talk /////
    $scope.getInfo = function (event, talk, date) {
        y = event.pageY;
        $scope.selectedTalk = talk;
        $scope.selectedTalkDate = date;
    }
    $scope.convertHtml = function (desc) {

        return converter.makeHtml('**Description**:' + desc);
    }
    $scope.convertHtmlprogram = function (desc) {

        return converter.makeHtml('**Program**:' + desc);
    }

});

var y = 1;

$('#infoModal').on('show.bs.modal', function (e) {
    $('#infoModal').css('top', y + 'px');
});

$('#infoModal').on('hide.bs.modal', function (e) {
    //    y = 1
});

function toITCFormat(date, time) {
    var timeCont = [],
        dateCont = [];

    if (time.toLowerCase().indexOf('pm') != -1) {

        timeCont = time.toLowerCase().replace('pm', 00).split(':'); //assuming from your question seconds is never mentioned but only hh:mm i.e. hours and minutes
        timeCont[0] = (parseInt(timeCont[0]) + 12) % 24;
    } else if (time.toLowerCase().indexOf('am') != -1) {
        timeCont = time.toLowerCase().replace('am', 00).split(':');
    } else {
        timeCont = (time.toLowerCase() + '00').split(':');
    }
    dateCont = date.split('/');

    return dateCont.join('') + 'T' + (timeCont[0] - 2) + timeCont[1] + 'Z';
}


//var x = toITCFormat('2014/09/04', '02:30PM');
//console.log(x); // this will output ur .ics format

window.addEventListener('message', function (event) {
    var messageContent = event.data.split(':');
    var topOffset = messageContent[0];
    var currentScroll = messageContent[1];
    y = currentScroll
    //calculate padding value and update the modal top-padding

}, false);

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet'
import './App.css'
import 'leaflet/dist/leaflet.css';


async function fetchReceivers() {
  let response = await fetch("https://sdr-list.xyz/api/get_websdrs");
  let json = await response.json();
  return json
}

function getLink(receiver) {
  if (receiver.hostname.length > 0) {
    return `http://${receiver.hostname}:${receiver.port}`;
  }
  return `http://${receiver.ip}:${receiver.port}`;
}



function getRangeText(receiver) {
  let start = (receiver.center_frequency - receiver.bandwidth / 2) / 100;
  let end = (receiver.center_frequency + receiver.bandwidth / 2) / 1000;

  return `${start} - ${end}`;
}

function checkReceiverFilter(filters, receiver) {

  let receiverStart = (receiver.center_frequency - receiver.bandwidth / 2) / 1000;
  let receiverEnd = (receiver.center_frequency + receiver.bandwidth / 2) / 1000;

  const noFilterSelected = Object.values(filters).every(value => value === false);
  if (noFilterSelected) {
    return true;
  }

  if (filters['160m'] && !(receiverStart <= 2000 && receiverEnd >= 1800)) {
    return false;
  }
  if (filters['80m'] && !(receiverStart <= 4000 && receiverEnd >= 3500)) {
    return false;
  }
  if (filters['40m'] && !(receiverStart <= 7300 && receiverEnd >= 7000)) {
    return false;
  }
  if (filters['20m'] && !(receiverStart <= 14350 && receiverEnd >= 14000)) {
    return false;
  }
  if (filters['2m'] && !(receiverStart <= 174000 && receiverEnd >= 165000)) {
    return false;
  }

  return true;
}


function getTotalUserCount(receivers) {
  var count = 0;
  for (var i = 0; i < receivers.length; i++) {
    count += receivers[i].users;
  }
  return count;
}

function Stats(props) {

  return (

    <div className='text-white mt-5 rounded bg-slate-800 w-72'>

      <p className='p-2 bg-sky-500 text-center h-6 flex items-center justify-center rounded-t'><i className="fa-solid fa-circle-info w-6 -h"></i> Stats</p>

      <div className='flex flex-col p-2 border-l border-b border-r border-sky-500'>
        <table className='text-white w-full'>

          <tbody>

            <tr>
              <td className='w-64'>
                Total Receivers:
              </td>

              <td className='font-mono'>
                {props.receivers.length}
              </td>
            </tr>

            <tr>

              <td className='w-48'>
                Total Users:
              </td>

              <td className='font-mono'>
                {getTotalUserCount(props.receivers)}
              </td>
            </tr>

          </tbody>

        </table>
      </div>

    </div>


  )
}

function Filters(props) {


  const toggleFilter = (band) => {
    props.setFilters((prevFilters) => ({
      ...prevFilters,
      [band]: !prevFilters[band],
    }));
  };

  return (

    <div className='text-white mt-5 rounded bg-slate-800 w-72'>

      <p className='p-2 bg-indigo-400 text-center h-6 flex items-center justify-center rounded-t'><i className="fa-solid fa-filter w-6"></i> Filters</p>

      <div className='flex flex-col items-center justify-between p-2 border-l border-b border-r border-indigo-400'>
        {Object.keys(props.filters).map((band) => (
          <button
            key={band}
            className={`block w-full my-1 rounded border border-slate-600 ${props.filters[band] ? 'bg-green-400  text-black font-bold' : 'bg-slate-800'}`}
            onClick={() => toggleFilter(band)}
          >
            {band}
          </button>
        ))}
      </div>

    </div>

  )
}


function SDRList(props) {

  const filteredReceivers = props.receivers.filter(receiver => checkReceiverFilter(props.filters, receiver));


  
  return (


    <div className='text-white flex flex-col justify-center items-center w-72 mt-5'>

      {filteredReceivers.map((receiver) =>

        <a key={receiver.id} className='relative border border-slate-600 p-2 rounded bg-slate-800 m-1 w-full' target="_blank" href={getLink(receiver)}>

          <div className='flex items-center justify-center'>
            <p className='font-bold inline'>{receiver.name}</p>
          </div>

          <div id="stats" className='flex justify-center items-center flex-col mt-2'>

            <table className='table-fixed'>

              <tbody>

                <tr className='border-b border-slate-700'>
                  <td className='flex'>

                    <div className='flex justify-center items-center w-6'>
                     <i className="fa-solid fa-location-dot"></i>
                    </div>
             
                    <span className='pl-2'>Location</span>
                  </td>
                  <td>
                    <img className='w-6 block bg-slate-100' src={getFlagImage(receiver)}/>
                  </td>
                </tr>


                <tr className='border-b border-slate-700'>
                  <td className='flex'>

                    <div className='flex justify-center items-center w-6'>
                     <i className="fa-solid fa-left-right"></i>
                    </div>
             
                    <span className='pl-2'>Range</span>
                  </td>
                  <td>
                  {getRangeText(receiver)}
                  </td>
                </tr>





                <tr className='border-b border-slate-700'>
                  <td className='flex'>

                    <div className='flex justify-center items-center w-6'>
                     <i className="fa-solid fa-tower-cell"></i>
                    </div>
                    
                    <span className='pl-2'>Antenna</span>
                  </td>
                  <td>
                  {receiver.antenna}
                  </td>
                </tr>



                

                <tr>
                  <td className='flex'>

                    <div className='flex justify-center items-center w-6'>
                     <i className="fa-regular fa-user"></i>
                    </div>
                    
                    <span className='pl-2'>Users</span>
                  </td>
                  <td>
                  {receiver.users}
                  </td>
                </tr>

           
   
              </tbody>

            </table>

          </div>

        </a>

      )}
    </div>

  )
}

function gridLocatorToLatLng(gridLocator) {
  // Ensure the grid locator is in the correct format (2, 4, 6 or 8 characters)
  const re = /^[A-R]{2}[0-9]{2}([A-X]{2})?([0-9]{2})?$/i;
  if (!re.test(gridLocator)) {
    throw new Error('Invalid grid locator format');
  }

  gridLocator = gridLocator.toUpperCase();

  // Latitude and longitude start values
  let lng = -180.0;
  let lat = -90.0;

  // Add longitude for first pair (fields)
  lng += (gridLocator.charCodeAt(0) - 'A'.charCodeAt(0)) * 20;
  lat += (gridLocator.charCodeAt(1) - 'A'.charCodeAt(0)) * 10;

  // If the locator is not just a field
  if (gridLocator.length >= 4) {
    // Add longitude for second pair (squares)
    lng += parseInt(gridLocator[2]) * 2;
    lat += parseInt(gridLocator[3]) * 1;

    // If the locator includes subsquares
    if (gridLocator.length >= 6) {
      // Add longitude for third pair (subsquares)
      lng += (gridLocator.charCodeAt(4) - 'A'.charCodeAt(0)) * 5 / 60;
      lat += (gridLocator.charCodeAt(5) - 'A'.charCodeAt(0)) * 2.5 / 60;

      // If the locator includes extended subsquares
      if (gridLocator.length === 8) {
        // Add longitude for fourth pair (extended subsquares)
        lng += parseInt(gridLocator[6]) * 5 / 600;
        lat += parseInt(gridLocator[7]) * 2.5 / 600;
      }
    }
  }

  // The lat/lng is at the southwest corner of the square; adjust to center
  if (gridLocator.length === 2) {
    lng += 10;
    lat += 5;
  } else if (gridLocator.length === 4) {
    lng += 1;
    lat += 0.5;
  } else if (gridLocator.length === 6) {
    lng += 2.5 / 60;
    lat += 1.25 / 60;
  } else if (gridLocator.length === 8) {
    lng += 2.5 / 600;
    lat += 1.25 / 600;
  }

  return [lat, lng];
}



function SDRMap(props) {
  const filteredReceivers = props.receivers.filter(receiver => checkReceiverFilter(props.filters, receiver));



  return (
    <div className='bg-slate-500 mt-5 w-72 h-72 sm:w-full sm:h-96'>
      <MapContainer className='w-full h-full' center={[51.00, 9.00]} zoom={2} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredReceivers.map(receiver => (


          <Marker key={receiver.id} position={gridLocatorToLatLng(receiver.grid_locator)}>
            <Popup className='w-64' minWidth={64}>


              <h1 className='font-bold mb-2 text-center'> {receiver.name}</h1>



              <div>
                <span className='inline-block w-32'>Antenna</span>
                <span className='inline'>{receiver.antenna}</span>
              </div>

              <div>
                <span className='inline-block w-32'>Range</span>
                <span className='inline'>{getRangeText(receiver)}</span>
              </div>

              <div>
                <span className='inline-block w-32'>Users</span>
                <span className='inline'>{receiver.users}</span>
              </div>



              <a className='mt-2 block w-full bg-slate-300 uppercase font-thin rounded p-1 text-center' target="_blank" href={getLink(receiver)}>Open</a>

            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function ModeSwitchButton(props) {

  let text = "";

  if (props.mapView) {
    text = "Map Mode"
  } else {
    text = "List Mode"
  }
  return (
    <button className='bg-slate-800 w-72 px-2 py-1 border border-slate-600 rounded text-white mt-5 mx-0' onClick={() => props.setMapView(!props.mapView)}>{text}</button>
  )
}

function CurrentlyNoReceivers() {
  return (
    <div className='mt-5 text-white flex flex-col w-full items-center justify-center'>
      <i className="text-5xl inline fa-regular fa-circle-xmark"></i>

      <p className='text-2xl mt-2'>Currently No Receivers</p>
    </div>
  )
}

function getFlagImage(receiver){
  return `https://flagcdn.com/${receiver.country}.svg`;
}


async function getCountry(receiver){
  try {
    let response = await fetch(`https://api.country.is/${receiver.ip}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let json = await response.json();
    return json.country.toLowerCase();
  } catch (error) {
    console.error("Could not fetch country: ", error);
  }
}

function App() {

  const [receivers, setReceivers] = useState([]);
  const [mapView, setMapView] = useState(false);

  const [filters, setFilters] = useState({
    '160m': false,
    '80m': false,
    '40m': false,
    '20m': false,
    '2m': false
  });

  useEffect(() => {

    const fetchData = async () => {
      const receiversData = await fetchReceivers();
      const updates = receiversData.map(async receiver => {
        receiver.country = await getCountry(receiver) || receiver.country;
        return receiver;
      });
  
      Promise.all(updates).then(updatedReceivers => {
        setReceivers(updatedReceivers);
      });
    };
  
    fetchData();
    const intervalId = setInterval(fetchData, 10000); // Update interval set to 10 seconds
  
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>

      <div className='bg-slate-800 w-full border-b border-slate-600 p-2'>
        <h1 className='text-white text-center font-bold'>SDR List</h1>
      </div>

      <div className='flex  flex-col items-center justify-center select-none m-5'>

        <a href="https://github.com/Steven9101/PhantomSDR-Plus" className='font-bold text-center mt-3 text-sky-500 underline'><i className="fa-solid fa-link"></i> Guide: Host Your Own SDR</a>

        <Stats receivers={receivers}></Stats>
        <Filters filters={filters} setFilters={setFilters}></Filters>

        <ModeSwitchButton mapView={mapView} setMapView={setMapView}></ModeSwitchButton>

        {
          (() => {

            if (receivers.length == 0) {
              return <CurrentlyNoReceivers></CurrentlyNoReceivers>
            }


            if (mapView) {
              return <SDRMap receivers={receivers} filters={filters}></SDRMap>
            }

            return <SDRList receivers={receivers} filters={filters}></SDRList>

          })()

        }

      </div>

    </>
  );
}


export default App

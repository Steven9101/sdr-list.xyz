
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


function getFlagImage(receiver) {
  return `https://flagcdn.com/${receiver.country}.svg`;
}

async function getCountry(receiver) {
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




function getRangeText(receiver) {
  let start = (receiver.center_frequency - receiver.bandwidth / 2) / 1000000;
  let end = (receiver.center_frequency + receiver.bandwidth / 2) / 1000000;

  return `${start.toFixed(2)} - ${end.toFixed(2)} mhz`;
}

function checkReceiverFilter(filterFrequency, receiver) {

  if (filterFrequency === -1) {
    return true;
  }

  let start = (receiver.center_frequency - receiver.bandwidth / 2) / 1000000;
  let end = (receiver.center_frequency + receiver.bandwidth / 2) / 1000000;

  return filterFrequency >= start && filterFrequency <= end;
}


function getSortedAndFilteredReceiverList(props) {

  const receiverlist = props.receivers
    .filter(receiver => checkReceiverFilter(props.filterFrequency, receiver))
    .sort((a, b) => b.users - a.users);

  return receiverlist;
}


function gridLocatorToLatLng(gridLocator) {

  const re = /^[A-R]{2}[0-9]{2}([A-X]{2})?([0-9]{2})?$/i;
  if (!re.test(gridLocator)) {
    throw new Error('Invalid grid locator format');
  }

  gridLocator = gridLocator.toUpperCase();

  let lng = -180.0;
  let lat = -90.0;

  lng += (gridLocator.charCodeAt(0) - 'A'.charCodeAt(0)) * 20;
  lat += (gridLocator.charCodeAt(1) - 'A'.charCodeAt(0)) * 10;

  if (gridLocator.length >= 4) {
    lng += parseInt(gridLocator[2]) * 2;
    lat += parseInt(gridLocator[3]) * 1;

    if (gridLocator.length >= 6) {
      lng += (gridLocator.charCodeAt(4) - 'A'.charCodeAt(0)) * 5 / 60;
      lat += (gridLocator.charCodeAt(5) - 'A'.charCodeAt(0)) * 2.5 / 60;

      if (gridLocator.length === 8) {
        lng += parseInt(gridLocator[6]) * 5 / 600;
        lat += parseInt(gridLocator[7]) * 2.5 / 600;
      }
    }
  }

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

function updateReceiverList(setReceivers) {

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
    const intervalId = setInterval(fetchData, 10 * 1000);
    return () => clearInterval(intervalId);
  }, []);

}


function SDRList(props) {
  return (

    <div className='text-black dark:text-white items-center w-72 my-2'>

      {getSortedAndFilteredReceiverList(props).map((receiver, index) =>

        <a
          key={receiver.id}
          className='w-full block opacity-0 shadow shadow-gray-400 dark:shadow-slate-700 border border-gray-300 dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 m-1 w-full my-2 animate-scaleIn'
          style={{ animationDelay: `${200 * index}ms` }} // Inline style for delay
          target="_blank"
          href={getLink(receiver)}
        >

          <p className='font-bold truncate text-center'>{receiver.name}</p>

          <div className='flex justify-center items-center flex-col mt-2'>

            <table className='table-fixed'>

              <tbody>

                <tr className='border-b border-gray-300 dark:border-slate-700'>
                  <td className='flex'>

                    <div className='flex justify-center items-center w-6'>
                      <i className="fa-solid fa-location-dot"></i>
                    </div>

                    <span className='pl-2'>Location</span>
                  </td>
                  <td>
                    <img className='w-6 block bg-gray-200 dark:bg-slate-100' src={getFlagImage(receiver)} />
                  </td>
                </tr>

                <tr className='border-b border-gray-300 dark:border-slate-700'>
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

                <tr className='border-b border-gray-300 dark:border-slate-700'>
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
  );
}




function SDRMap(props) {

  return (
    <div className='flex-grow rounded-2xl mt-5 w-full h-full p-5' >
      <MapContainer className='rounded-2xl w-full h-full' center={[51.00, 9.00]} zoom={2} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {getSortedAndFilteredReceiverList(props).map(receiver => (

          <Marker key={receiver.id} position={gridLocatorToLatLng(receiver.grid_locator)}>

            <Popup className='w-64' minWidth={64}>
              <h1 className='font-bold mb-2 text-center'> {receiver.name}</h1>

              <div>
                <span className='inline-block w-28'>Antenna</span>
                <span className='inline'>{receiver.antenna}</span>
              </div>

              <div>
                <span className='inline-block w-28'>Range</span>
                <span className='inline'>{getRangeText(receiver)}</span>
              </div>

              <div>
                <span className='inline-block w-28'>Users</span>
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
  return (
    <div className='flex text-black dark:text-white my-2'>
      <div className='flex justify-center items-center'>
        <i className="fa-solid fa-list"></i>
        <p className='ml-2'>List</p>
      </div>

      <div className="relative flex items-center w-12 rounded-full bg-gray-300 dark:bg-slate-500 border border-gray-400 dark:border-slate-400 mx-2 cursor-pointer" onClick={() => props.setMapView(!props.mapView)}>
        <div className={`absolute w-4 h-4 rounded-full bg-white dark:bg-slate-200 border border-gray-500 dark:border-slate-700 m-1 ${props.mapView ? 'right-0' : 'left-0'}`}></div>
      </div>

      <div className='flex justify-center items-center'>
        <i className="fa-solid fa-map"></i>
        <p className='ml-2'>Map</p>
      </div>
    </div>
  );
}



function CurrentlyNoReceivers() {
  return (
    <div className='mt-5 text-white flex flex-col w-full items-center justify-center'>
      <i className="text-5xl inline fa-regular fa-circle-xmark"></i>
      <p className='text-2xl mt-2'>Currently No Receivers</p>
    </div>
  )
}



function FrequencyFilter(props) {

  const handleFrequencyInputChange = (event) => {
    const value = event.target.value;
    const regex = /^[0-9]*\.?[0-9]*$/;
    if (value === '') {
      props.setFilterFrequency(-1);
    } else if (regex.test(value)) {
      props.setFilterFrequency(Number(value));
    }
  };
  return (
    <div className='flex flex-row items-center justify-between rounded-b my-2'>

      <input
        type="text"
        className='dark:text-white dark:bg-slate-700 dark:border-slate-600 bg-gray-100 rounded p-1 border border-gray-200'
        placeholder='Filter Frequency (Mhz)'
        onChange={handleFrequencyInputChange}
        pattern="[0-9]*"
      />
    </div>
  )
}


function DarkModeToggleButton(props) {

  let icon = "fa-sun";

  if (props.darkMode) {
    icon = "fa-sun"
  } else {
    icon = "fa-moon"
  }

  const toggleDarkMode = () => {
    props.setDarkMode(!props.darkMode);

    if (props.darkMode) {
      document.body.classList.remove("dark");

    } else {
      document.body.classList.add("dark");
    }
  }

  return (
    <button onClick={toggleDarkMode} className='absolute w-8 h-8 top-1 right-2 flex items-center justify-center dark:text-white p-2 '>
      <i className={"fa-regular " + icon}></i>
    </button>
  )
}

function App() {

  const [receivers, setReceivers] = useState([]);
  const [mapView, setMapView] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [filterFrequency, setFilterFrequency] = useState(-1);

  updateReceiverList(setReceivers);

  return (
    <>
      <div className="flex flex-col items-center select-none h-full dark:bg-slate-900 ">
        <div className='dark:bg-slate-800 w-full border-b dark:border-slate-600 border-slate-300 p-2'>
          <h1 className='dark:text-white text-slate-500 text-center font-bold'>SDR List</h1>
        </div>
        <a href="https://github.com/Steven9101/PhantomSDR-Plus" className='font-bold text-center my-2 text-sky-500 underline'><i className="fa-solid fa-link"></i> Guide: Host Your Own SDR</a>


        <DarkModeToggleButton darkMode={darkMode} setDarkMode={setDarkMode}></DarkModeToggleButton>

        <FrequencyFilter filterFrequency={filterFrequency} setFilterFrequency={setFilterFrequency}></FrequencyFilter>

        {receivers.length === 0 ? (
          <CurrentlyNoReceivers></CurrentlyNoReceivers>
        ) : (
          <>
            <ModeSwitchButton mapView={mapView} setMapView={setMapView}></ModeSwitchButton>
            {mapView ? (
              <SDRMap receivers={receivers} filterFrequency={filterFrequency}></SDRMap>
            ) : (
              <SDRList receivers={receivers} filterFrequency={filterFrequency}></SDRList>
            )}
          </>
        )}
      </div>
    </>
  );
}



export default App

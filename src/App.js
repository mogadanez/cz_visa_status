import React, { Component } from 'react';
import './App.css';
import ReactTable from "react-table";
import "react-table/react-table.css";
import _ from "lodash";
import axios from "axios";

var rawData = null;
var cities = null;

const loadData = ()=>{
    return Promise.all( [ axios.get("https://visa.poigraem.ru/data/plain.json"),
                          axios.get("https://visa.poigraem.ru/data/cities.json")
    ])
        .then(([ resData, resCity ])=>{
          rawData = _.values(resData.data);
          cities =  resCity.data
          cities.unshift("");
          return rawData ;
    })



}


class App extends Component {

    constructor() {
        super();
        this.state = {
            data: [],
            loading: true
        };
        loadData().then(()=>{
            var  ff = this.loadFilters();
            this.setState( {data:rawData, cities:cities, loading:false, filtered:  ff })
        })
    }

    loadFilters(){

        try {
            return JSON.parse(localStorage["filters"]) ||[]
        }
        catch(e){
            return []
        }

    }

    updateFilter (filters, value){

        localStorage["filters"] = JSON.stringify( filters )

        this.setState( {filtered:  filters } )

    }

    render() {
        const { data, cities, loading, filtered } = this.state;
        return (
            <div>
            <div className="container">
                <ReactTable
                    columns={[
                        {
                            Header: "City",
                            accessor: "city",
                            Filter: ({ filter, onChange }) =>
                                <select
                                    onChange={event => onChange(event.target.value)}
                                    style={{ width: "100%" }}
                                    value={filter ? filter.value : ">DP, PP, DV - prodl"}
                                >
                                    {_.map( cities, c=>{
                                        return (
                                            <option value={c} key={c}>{c}</option>
                                        );
                                    } )
                                    }
                                </select>

                        },
                        {
                            Header: "Document Type",
                            accessor: "type",
                            Filter: ({ filter, onChange }) =>
                                <select
                                    onChange={event => onChange(event.target.value)}
                                    style={{ width: "100%" }}
                                    value={filter ? filter.value : ">DP, PP, DV - prodl"}
                                >
                                    <option value=""></option>
                                    <option value="DP, PP, DV - prodl">DP, PP, DV - prodl</option>
                                    <option value="Trvalé pobyty">Trvalé pobyty</option>
                                    <option value="Zaměstnanecká karta">Zaměstnanecká karta</option>
                                </select>
                        },
                        {
                            Header: "Application code",
                            accessor: "application",
                            filterMethod: (filter, row) => {
                                const id = filter.pivotId || filter.id;
                                return (
                                    row[id] !== undefined ?
                                        String(row[id].toLowerCase()).trim().indexOf(filter.value.toLowerCase().trim())>-1:true
                                );
                            }
                        }
                    ]}
                    data={data}
                    loading={loading} // Display the loading overlay when we need it
                    //onFetchData={this.fetchData} // Request new data when things change
                    filterable
                    filtered={filtered}
                    defaultPageSize={20}
                    onFilteredChange={(column, value) => {
                        this.updateFilter(column, value)
                    }}
                    className="-striped -highlight"
                />

                <div className="tools">
                    <form action="//visaapi.poigraem.ru/subscribe" method="POST">
                         <label >Email:</label>
                        <input type="text" value=""  name="email">
                        </input>
                        <button> Subscribe</button>
                    </form>
                </div>
            </div>
                <footer>
                    <div className="container">
                        <div className="col">
                            <a href=""
                        </div>
                        <div className="col">
                            <a href="https://www.paypal.me/mogadanez" target="_blank"><img className="donate" src="http://www.pngall.com/wp-content/uploads/2016/05/PayPal-Donate-Button-PNG-Clipart.png"/></a>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
}


export default App;

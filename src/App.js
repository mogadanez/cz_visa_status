import React, { Component } from 'react';
import './App.css';
import ReactTable from "react-table";
import "react-table/react-table.css";
import _ from "lodash";
import axios from "axios";

import Button from "material-ui/Button";
import TextField from 'material-ui/TextField';
import Icon from "material-ui/Icon";
import SendIcon from "material-ui-icons/Send";
var rawData = null;
var lastUpdated = null;
var cities = null;

const loadData = ()=>{
    return Promise.all( [ axios.get("https://visa.poigraem.ru/data/plain.json"),
                          axios.get("https://visa.poigraem.ru/data/cities.json")
    ])
    .then(([ resData, resCity ])=>{

          if ( resData.data.__version == 2 ){
            rawData = _.values(resData.data.applications);
            lastUpdated = resData.data.lastUpdated;
          }
          else
            rawData = _.values(resData.data)
          cities =  resCity.data;
          cities.unshift("");
          return rawData ;
    })
}


class App extends Component {

    constructor() {
        super();
        this.onSubscribe = this.onSubscribe.bind(this)
        this.onSubscribeEmailChanged = this.onSubscribeEmailChanged.bind(this)
        this.state = {
            data: [],
            loading: true
        };
        loadData().then(()=>{
            var  ff = this.loadFilters();
            this.setState( {data:rawData, cities,lastUpdated, loading:false, filtered:  ff })
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

    onSubscribeEmailChanged(ev){
        this.setState( { subscribeEmail:ev.target.value })
    }

    onSubscribe(){

        if ( !this.state.subscribeEmail )
            {
                this.setState({subscribeEmailError: "Email is required" })
                return;
            }
        else
            this.setState({subscribeEmailError: null })

        var filters = this.loadFilters();

        var applicationFilter = _.find(filters,  x=>{
            return  x.id  === "application"
        });
        if ( !applicationFilter || !applicationFilter.value ) {
            this.setState({subscribeFiltersError: "Application Filter should be provided"})
            return
        }
        else
            this.setState({subscribeFiltersError: null })
            axios.post("https://gnkz23t88c.execute-api.us-east-1.amazonaws.com/prod/subscription", {email: this.state.subscribeEmail, filters  } )
            .then(res=>{
                this.setState({subscribeFiltersError: null,  subscribeSuccess: "Subscribe established successfully" })
                console.log( res.data )
            })
            .catch(ex=>{
                this.setState({subscribeFiltersError: "Something is going wrong"})
            })

    }

    updateFilter (filters, value){

        localStorage["filters"] = JSON.stringify( filters )

        this.setState( {filtered:  filters } )

    }

    render() {
        const { data, cities, loading, lastUpdated, filtered, subscribeEmail, subscribeEmailError, subscribeFiltersError, subscribeSuccess } = this.state;
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
                                    value={filter ? filter.value : "DP, PP, DV - prodl"} >
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
                        {lastUpdated? (<p>
                            Last updated: <strong>{new Date(lastUpdated).toLocaleString()}</strong>
                        </p>):null}
                        <p>
                            Description
                        </p>
                        <span className="error">{subscribeFiltersError}</span>
                        <span className="success">{subscribeSuccess}</span>
                        <ul>
                            Subscribe with follow rules:
                            {_.map(filtered, f => {
                                return (
                                    <li key={f.id}><span className="filterLabel">{f.id}: </span>
                                        {f.id=="application"?(<span className="filterContains"> contains </span>):null}
                                        {f.value}</li>
                                );
                            })}
                        </ul>

                        <TextField type="email"
                                   label="Your Email" fullWidth required
                                   error={subscribeEmailError?true:false}
                                   helperText={subscribeEmailError}
                                   placeholder="Your Email"  name="email" value={subscribeEmail||""}
                                   margin="normal" onChange={this.onSubscribeEmailChanged}></TextField>
                        <Button variant="raised" color="primary" onClick={this.onSubscribe}>
                            <SendIcon/> Subscribe
                        </Button>
                    </form>
                </div>
            </div>
                <footer>
                    <div className="container">
                        <div className="col">
                            <span>build by @mogadanez</span>
                            <a href="https://github.com/mogadanez/cz_visa_status">GitHub</a>
                            <a href="mailto:mogadanez@gmail.com">Contact me</a>
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

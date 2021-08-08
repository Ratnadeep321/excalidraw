import React, { Component } from 'react';
import {storage} from "../../src/firebase/index"

class ListImages extends Component {
    constructor(props){
        super(props)
        this.state={
            images:[],
            row:null
        }
    }
    
    componentDidMount(){
      
              
              let i=0
              storage.ref().child('images').listAll().then(function(result){
                result.items.forEach(function(imageRef){
                  //console.log(imageRef.toString())
            i++
            this.displayImage(i, imageRef)
                })
              })
    }
     displayImage=(row,images)=>{
        //const [image,setImage]=useState(null)
          images.getDownloadURL().then((url) => {
            // in here you can set the URL for the avatar
            console.log(url)
           // setImage(url)
           this.setState({images:url})
           this.setState({row:row})

          });
        }
    render() {
        return (
            <div>
              <table style="width:100%">
                    <tr>
                        <th>sr. no</th>
                        <th>images</th>
                       
                    </tr>
                   
                    <tr>
                    {
                     this.state.images.length?  
                         this.state.images.map(image=>{(
                            <td>{image}</td>
                        )
                        }):<></>
                    }
                    </tr>
                  
                </table>
            </div>
        );
    }
}

export default ListImages;
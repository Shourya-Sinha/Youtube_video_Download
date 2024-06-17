const exress =require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const ytdl = require('ytdl-core');
const DataModel = require('./Model/Data');
const path = require('path');
//const __dirname = path.resolve();
const app = exress();

const PORT = 7000;

app.use(cors());


app.use(exress.json());
const DB = 'mongodb+srv://shourya:shourya123@shourya-cluster.d6dznha.mongodb.net/UrlDataBase?retryWrites=true&w=majority&appName=Shourya-Cluster'

mongoose.connect(DB).then((con) => {
    console.log('Database connected Successfully');
}).catch((err) => {
    console.log('Error connecting on Database', err);
});

app.post('/download', async (req,res) =>{
    try {
         const {VideoLink} = req.body;

         if(!VideoLink){
            return res.status(400).json({
                status:'error',
                message:'Video Link is required',
            });
         }

         if(!ytdl.validateURL(VideoLink)){
            return res.status(400).json({
                status:'error',
                message:'Invalid YouTube Video Link',
            });
         }

         const data = await DataModel.findOneAndUpdate(
            {VideoLink},
            {$inc: {NoOfProgression: 1}},
            {new:true,upsert:true}
         );

         const info =await ytdl.getInfo(VideoLink);
         const format =ytdl.chooseFormat(info.formats, { quality: 'highest' });

        // Set response headers for file download
        //res.header('Content-Disposition', `attachment; filename="${info.title}.mp4"`);
        const sanitizedFileName = info.videoDetails.title.replace(/[^a-zA-Z0-9 ._-]/g, ''); // Replace invalid characters

res.header('Content-Disposition', `attachment; filename="${sanitizedFileName}.mp4"`);

        //res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        const videoStream = ytdl(VideoLink, { format: format });

        videoStream.on('error', async (error) => {
            // Decrement in-progress count if an error occurs
            await DataModel.findOneAndUpdate(
              { VideoLink },
              { $inc: { NoOfProgression: -1 } }
            );
            console.error(`Error downloading video: ${error.message}`);
          });
        
          videoStream.on('end', async () => {
            // Increment completion count and decrement in-progress count when finished
            await DataModel.findOneAndUpdate(
              { VideoLink },
              { $inc: { NoofCompletion: 1, NoOfProgression: -1 } }
            );
            console.log(`Finished downloading: ${VideoLink}`);
          });
        if (format.contentLength) {
            res.header('Content-Length', format.contentLength);
          }
        //   res.on('finish', async () => {
        //     await DataModel.findOneAndUpdate(
        //         {VideoLink},
        //         { $inc: { NoofCompletion: 1, NoOfProgression: -1 } } 
        //     )
        //   })


        videoStream.pipe(res);
// var noofcomlete = 0;
// var noofrogress = 0;
//          const data = new DataModel({
//              VideoLink,
//              NoofCompletion:noofcomlete+=1,
//              NoOfProgression:noofrogress+=1,
//             //  VideoTitle:info.videoDetails.title,
//             //  VideoThumbnail:info.videoDetails.thumbnails[0].url,
//             //  VideoDuration:info.videoDetails.lengthSeconds,
//             //  VideoFormat:format.mimeType,
//             //  VideoSize:format.size,
//             //  VideoDownloadLink:format.url,
//          });

//          await data.save();

    } catch (error) {
        console.log('Error in Downloading Video', error);
        return res.status(500).json({
            status:'error',
            message:error.message,
        });
    }
});

app.get('/download-counts', async (req, res) => {
    try {
        // Aggregate total counts for completion and progression
        const pipeline = [
            {
                $group: {
                    _id: null,
                    totalCompletion: { $sum: "$NoofCompletion" },
                    totalProgression: { $sum: "$NoOfProgression" }
                }
            }
        ];

        const counts = await DataModel.aggregate(pipeline);
        const totalCounts = counts[0] || { totalCompletion: 0, totalProgression: 0 };

        return res.status(200).json({
            status: 'success',
            completedCount: totalCounts.totalCompletion,
            inProgressCount: totalCounts.totalProgression
        });

    } catch (error) {
        console.log('Error fetching download counts', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
});

// app.get('/download-counts', async (req, res) => {
//     try {
//         const completedCount = await DataModel.countDocuments({ NoofCompletion: { $gt: 0 } });
//         const inProgressCount = await DataModel.countDocuments({ NoOfProgression: { $gt: 0 } });
  
//       return res.status(200).json({
//         status: 'success',
//         completedCount,
//         inProgressCount,
//       });
//     } catch (error) {
//       console.log('Error fetching download counts', error);
//       res.status(500).json({
//         status: 'error',
//         message: error.message,
//       });
//     }
//   });
  
app.use(exress.static(path.join(__dirname, '../Frontend/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/dist', 'index.html'));
});


app.listen(PORT , () => {
    console.log(`Server is running on port ${PORT}`);
});
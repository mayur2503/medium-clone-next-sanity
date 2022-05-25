import { GetStaticProps } from 'next'
import React, { FC, useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import PortableText from 'react-portable-text'
import Header from '../../components/Header'
import { sanityClient, urlFor } from '../../sanity'
import { Post } from '../../typings'

interface Props {
    post: Post
}

interface IFormInput {
    _id: string;
    name: string;
    email: string;
    comment: string
}


const Post: FC<Props> = ({ post }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<IFormInput>()
    const [submited, setSubmited] = useState(false)

    const onSubmit: SubmitHandler<IFormInput> = async (data) => {
        await fetch('/api/createComment', {
            method: "POST",
            body: JSON.stringify(data)
        }).then(() => {
            setSubmited(true)
        }).catch((err) => {
            console.log(err)
            setSubmited(false)
        })

    }


    return (
        <main>
            <Header />
            <img className='h-40 w-full object-cover' src={urlFor(post.mainImage).url()!} alt="" />
            <article className='max-w-3xl mx-auto p-5'>
                <h1 className='text-3xl mt-10 mb-3' >{post.title}</h1>
                <h2 className='text-xl font-light text-grey-500'>{post.description}</h2>
                <div className="flex items-center space-x-2 pt-1">
                    <img className='h-10 w-10 rounded-full' src={urlFor(post.author.image).url()!} alt="" />
                    <p className='font-extralight text-sm'>Blog post by <span className='text-green-600'>{post.author.name}</span>  Published At  {new Date(post._createdAt).toLocaleString()}</p>
                </div>
                <div className="mt-10">
                    <PortableText
                        className='bg-white'
                        dataset={process.env.NEXT_PUBLIC_SANITY_DATASET}
                        projectId={process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}
                        content={post.body}
                        serializers={
                            {
                                h1: (props: any) => (
                                    <h1 className='text-2xl font-bold' {...props} />
                                ),
                                h2: (props: any) => (
                                    <h2 className='text-xl font-bold' {...props} />
                                ),
                                li: ({ children }: any) => (
                                    <li className='ml-4 list-disc'>{children}</li>
                                ),
                                link: ({ href, children }: any) => (
                                    <a href={href} className="text-blue-500 hover:underline"> {children}</a>
                                )
                            }
                        }
                    />
                </div>
            </article>
            <hr className='max-w-lg my-5 mx-auto border border-yellow-500' />
            {submited ?
                <div className='flex flex-col py-10 my-10 bg-yellow-500 text-white max-w-2xl mx-auto p-10'>
                    <h3 className='text-3xl font-bold'>
                        Thank you for submitting your comment
                    </h3>
                    <p>Once it has been approved, it will appear below</p>

                </div> :
                (
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col p-5 max-w-2xl mx-auto mb-10">
                        <h3 className='text-sm text-yellow-500'>Enjoyed this article?</h3>
                        <h4 className='text-3xl font-bold'>Leave a comment bellow!</h4>
                        <hr className='py-3 mt-2 ' />
                        <input {...register("_id")} type="hidden" name="_id" value={post._id} />
                        <label className='block mb-5' htmlFor="">
                            <span className='text-gray-700'>Name</span>
                            <input {...register("name", { required: true })} name="name" className='shadow border rounded py-2 px-3 form-input block w-full ring-yellow-500 focus:ring outline-none' placeholder='Enter your name' type="text" />
                        </label>
                        <label className='block mb-5' htmlFor="">
                            <span className='text-gray-700'>Email</span>
                            <input {...register("email", { required: true })} name="email" className='shadow border rounded py-2 px-3 form-input block w-full ring-yellow-500 focus:ring outline-none' placeholder='Enter your email' type="email" />
                        </label>
                        <label className='block mb-5' htmlFor="">
                            <span className='text-gray-700'>Comment</span>
                            <textarea {...register("comment", { required: true })} className='shadow border rounded  py-2 px-3 form-textarea block w-full ring-yellow-500 focus:ring outline-none' name="comment" id="" cols={30} rows={9}></textarea>
                        </label>
                        <input className='shadow bg-yellow-500 hover:bg-yellow-400 focus:shadow-outline focus:outline-none rounded text-white font-bold py-2 px-4 cursor-pointer' type="submit" value="Submit" />
                        <div className='flex flex-col p-5'>
                            {errors.name && (
                                <span className='text-red-500'>- The name field is  required</span>
                            )}
                            {errors.email && (
                                <span className='text-red-500'>- The email field is  required</span>
                            )}
                            {errors.comment && (
                                <span className='text-red-500'>- The comment field is  required</span>
                            )}
                        </div>
                    </form>
                )}
            <div className='flex flex-col p-10 m-10 max-w-xl mx-auto shadow-yellow-500 shadow space-y-2'>
                <h3 className='text-4xl'>Comments</h3>
                <hr className='pb-2' />
                {post.comments.map((comment) => (
                    <div key={comment._id} >
                        <p>
                            <span className='text-yellow-500'>{comment.name}</span>
                            {comment.comment}
                        </p>
                    </div>
                ))}
            </div>
        </main>
    )
}

export default Post

export const getStaticPaths = async () => {
    const query = `*[_type == "post"]{
        slug  {
            current
        }
      } 
    `
    const posts = await sanityClient.fetch(query)

    const paths = posts.map((post: Post) => ({
        params: {
            slug: post.slug.current
        }
    }))

    return {
        paths,
        fallback: 'blocking'
    }

}

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const query = `*[_type == "post" && slug.current == $slug][0]  {
        _id,
        slug,
        title,
        description,
        mainImage,
        author -> {
         name,image
        },
        body,
        _createdAt,
        'comments':*[
            _type=="comment" && 
            post._ref == ^._id &&
            approved == true
        ]
      }
    `

    const post = await sanityClient.fetch(query, {
        slug: params?.slug
    })

    if (!post) {
        return {
            notFound: true
        }
    }

    return {
        props: {
            post
        },
        revalidate: 60
    }

}